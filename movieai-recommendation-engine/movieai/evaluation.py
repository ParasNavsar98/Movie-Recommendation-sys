"""Repeatable evaluation harness.

    python -m movieai.evaluation                      # new engine + legacy baseline + report
    python -m movieai.evaluation --labels labels.csv  # also compute Precision/Recall/NDCG/MRR

Outputs (``reports/``):

* ``evaluation_top10.csv``      new engine, top-10 per fixed source movie, with component scores
* ``baseline_legacy_top10.csv`` the legacy ``src/recommender.py`` on the same movies
* ``evaluation_summary.json``   data quality, runtime, failures, score distributions, comparison metrics
* ``evaluation_report.md``      human-readable report incl. side-by-side lists

IMPORTANT: no ground-truth relevance labels ship with the dataset. Unless ``--labels`` is
supplied, **no precision/recall/NDCG is computed or claimed**. The comparison metrics below
are label-free *diagnostics* (they use the new engine's own TF-IDF as a yardstick, which
favours the new engine) and must be read together with the qualitative top-10 lists.
"""
from __future__ import annotations

import argparse
import importlib
import json
import logging
import math
import sys
import time
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
import pandas as pd

from .config import PROJECT_ROOT, Settings
from .preprocessor import normalize_title
from .recommender import Recommender

logger = logging.getLogger(__name__)

TEST_MOVIES = ["Inception", "Deadpool", "The Notebook", "The Avengers", "The Dark Knight",
               "Titanic", "Interstellar", "Toy Story", "The Matrix", "The Conjuring"]
TOP_K = 10
CSV_COLUMNS = ["Source_Movie_ID", "Source_Movie", "Rank", "Recommended_Movie_ID", "Recommended_Movie",
               "Similarity_Score", "Plot_Similarity", "Genre_Similarity", "Director_Similarity",
               "Genres", "Recommendation_Reasons"]


# ------------------------------------------------------------------ ranking metrics
def precision_at_k(ranked: Sequence[int], relevant: Mapping[int, float] | set[int], k: int) -> float:
    """Share of the top-k that is relevant (relevance > 0)."""
    if k < 1:
        raise ValueError("k must be >= 1")
    rel = set(relevant) if not isinstance(relevant, Mapping) else {m for m, g in relevant.items() if g > 0}
    return sum(1 for m in ranked[:k] if m in rel) / k


def recall_at_k(ranked: Sequence[int], relevant: Mapping[int, float] | set[int], k: int) -> float:
    """Share of all relevant items found in the top-k (0.0 if there are none)."""
    rel = set(relevant) if not isinstance(relevant, Mapping) else {m for m, g in relevant.items() if g > 0}
    return sum(1 for m in ranked[:k] if m in rel) / len(rel) if rel else 0.0


def ndcg_at_k(ranked: Sequence[int], gains: Mapping[int, float], k: int) -> float:
    """NDCG@k with graded gains (``2**gain - 1``). 0.0 when nothing is relevant."""
    def dcg(items: Sequence[float]) -> float:
        return sum((2 ** g - 1) / math.log2(i + 2) for i, g in enumerate(items))
    actual = dcg([gains.get(m, 0.0) for m in ranked[:k]])
    ideal = dcg(sorted((g for g in gains.values() if g > 0), reverse=True)[:k])
    return actual / ideal if ideal > 0 else 0.0


def reciprocal_rank(ranked: Sequence[int], relevant: Mapping[int, float] | set[int]) -> float:
    """1 / rank of the first relevant item (0.0 if none); the mean over queries is MRR."""
    rel = set(relevant) if not isinstance(relevant, Mapping) else {m for m, g in relevant.items() if g > 0}
    for pos, m in enumerate(ranked, 1):
        if m in rel:
            return 1.0 / pos
    return 0.0


def load_labels(path: Path) -> dict[int, dict[int, float]]:
    """CSV with columns ``Source_Movie_ID, Relevant_Movie_ID[, Relevance]`` (default relevance 1)."""
    frame = pd.read_csv(path)
    labels: dict[int, dict[int, float]] = {}
    for row in frame.itertuples():
        gain = float(getattr(row, "Relevance", 1.0))
        labels.setdefault(int(row.Source_Movie_ID), {})[int(row.Relevant_Movie_ID)] = gain
    return labels


# ------------------------------------------------------------------ helpers
def franchise_members(rec: Recommender, source_index: int) -> set[int]:
    """Weak title-only proxy for 'same franchise': another title that contains the source
    title as a whole-word sequence (or vice versa). Diagnostic only; never used by the engine."""
    titles = rec.dataset.df["Title"].tolist()
    source = f" {normalize_title(titles[source_index])} "
    out = set()
    for i, title in enumerate(titles):
        if i == source_index:
            continue
        other = f" {normalize_title(title)} "
        if source in other or other in source:
            out.add(int(rec._ids[i]))
    return out


def _describe(values: Sequence[float]) -> dict[str, float]:
    arr = np.asarray(values, dtype=float)
    if arr.size == 0:
        return {}
    q = np.quantile(arr, [0.0, 0.25, 0.5, 0.75, 1.0])
    return {"count": int(arr.size), "mean": float(arr.mean()), "std": float(arr.std()), "min": float(q[0]),
            "p25": float(q[1]), "median": float(q[2]), "p75": float(q[3]), "max": float(q[4])}


def _list_diagnostics(rec: Recommender, seed_idx: int, indices: list[int]) -> dict[str, float]:
    """Label-free diagnostics of one top-k list, measured with the new engine's components."""
    if not indices:
        return {}
    comps = rec.engine.components([seed_idx], indices)
    plot_raw, genre = comps.plot_raw[0], comps.genre[0]
    pairwise = rec.engine.pairwise_among(indices) if len(indices) > 1 else np.zeros((1, 1))
    off_diag = pairwise[~np.eye(len(indices), dtype=bool)] if len(indices) > 1 else np.array([0.0])
    return {
        "mean_plot_raw": float(plot_raw.mean()),
        "weak_plot_share": float((plot_raw < 0.05).mean()),          # raw TF-IDF cosine < 0.05
        "genre_only_share": float(((plot_raw < 0.05) & (genre >= 0.5)).mean()),
        "mean_genre": float(genre.mean()),
        "intra_list_diversity": float(1.0 - off_diag.mean()),
    }


def run_new_engine(rec: Recommender, sources: dict[str, int], diversity_lambda: float = 1.0):
    rows, runtimes = [], {}
    for name, movie_id in sources.items():
        start = time.perf_counter()
        result = rec.similar_to(movie_id, TOP_K, diversity_lambda=diversity_lambda)
        runtimes[name] = (time.perf_counter() - start) * 1000
        for rank, item in enumerate(result.items, 1):
            rows.append({
                "Source_Movie_ID": movie_id, "Source_Movie": name, "Rank": rank,
                "Recommended_Movie_ID": item.movie_id, "Recommended_Movie": item.record["Title"],
                "Similarity_Score": round(item.score, 6), "Plot_Similarity": round(item.components["plot_raw"], 6),
                "Plot_Similarity_Calibrated": round(item.components["plot"], 6),
                "Genre_Similarity": round(item.components["genre"], 6),
                "Director_Similarity": round(item.components["director"], 6),
                "Genres": item.record["Genres"], "Recommendation_Reasons": " | ".join(item.reasons),
            })
    return pd.DataFrame(rows), runtimes


def run_legacy(rec: Recommender, sources: dict[str, int], settings: Settings):
    """Run the unchanged legacy engine on the same Movie_IDs (or return ``None`` if unavailable)."""
    root = str(PROJECT_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    try:
        legacy_cls = importlib.import_module("src.recommender").MovieRecommender
    except Exception as exc:
        logger.warning("Legacy engine unavailable: %s", exc)
        return None, {}
    start = time.perf_counter()
    legacy = legacy_cls(settings.data_path)
    build_s = time.perf_counter() - start
    rows = []
    for name, movie_id in sources.items():
        out = legacy.recommend_by_id(movie_id, TOP_K)
        for rank, row in enumerate(out.itertuples(), 1):
            rows.append({"Source_Movie_ID": movie_id, "Source_Movie": name, "Rank": rank,
                         "Recommended_Movie_ID": int(row.Movie_ID), "Recommended_Movie": row.Title,
                         "Similarity_Score": round(float(row.Similarity_Score), 6), "Genres": row.Genres})
    return pd.DataFrame(rows), {"legacy_build_seconds": build_s}


def integrity(frame: pd.DataFrame) -> dict[str, int]:
    """Self-recommendation and duplicate checks over a results frame."""
    self_recs = int((frame["Source_Movie_ID"] == frame["Recommended_Movie_ID"]).sum())
    dups = int(frame.duplicated(["Source_Movie_ID", "Recommended_Movie_ID"]).sum())
    bad = int((~np.isfinite(frame["Similarity_Score"].to_numpy(dtype=float))).sum())
    return {"self_recommendations": self_recs, "duplicate_recommendations": dups, "non_finite_scores": bad,
            "rows": int(len(frame))}


def compare(rec: Recommender, sources: dict[str, int], new: pd.DataFrame, old: pd.DataFrame) -> dict[str, Any]:
    out: dict[str, Any] = {"per_source": {}}
    agg: dict[str, list[float]] = {}
    for name, movie_id in sources.items():
        seed = rec.dataset.require_index(movie_id)
        n_ids = new[new.Source_Movie_ID == movie_id].sort_values("Rank")["Recommended_Movie_ID"].tolist()
        o_ids = old[old.Source_Movie_ID == movie_id].sort_values("Rank")["Recommended_Movie_ID"].tolist()
        fam = franchise_members(rec, seed)
        entry = {
            "overlap_jaccard": len(set(n_ids) & set(o_ids)) / max(len(set(n_ids) | set(o_ids)), 1),
            "franchise_members_in_dataset": len(fam),
            "franchise_found_new": len(fam & set(n_ids)), "franchise_found_legacy": len(fam & set(o_ids)),
        }
        for label, ids in (("new", n_ids), ("legacy", o_ids)):
            d = _list_diagnostics(rec, seed, [rec.dataset.require_index(m) for m in ids])
            for k, v in d.items():
                entry[f"{k}_{label}"] = v
                agg.setdefault(f"{k}_{label}", []).append(v)
        out["per_source"][name] = entry
        for k in ("overlap_jaccard",):
            agg.setdefault(k, []).append(entry[k])
    out["mean"] = {k: float(np.mean(v)) for k, v in agg.items()}
    return out


# ------------------------------------------------------------------ report
def _markdown(summary: dict[str, Any], new: pd.DataFrame, old: pd.DataFrame | None) -> str:
    lines = ["# MOVIEAI evaluation report", "",
             "> **No ground-truth relevance labels exist for this dataset.** Numbers below are label-free "
             "diagnostics, not precision/accuracy. Judge quality from the top-10 lists (qualitative).", ""]
    dq = summary["data_quality"]
    lines += ["## Data quality", "", "| check | value |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in dq.items() if not isinstance(v, (list, dict)) and k not in ("source_path",)]
    lines += ["", "## Integrity & runtime", "", f"```\n{json.dumps({k: summary[k] for k in ('integrity_new', 'runtime', 'failed_queries')}, indent=2)}\n```", ""]
    lines += ["## Score distribution (new engine, top-10 lists)", "", f"```\n{json.dumps(summary['score_distribution'], indent=2)}\n```", ""]
    if "comparison" in summary:
        m = summary["comparison"]["mean"]
        lines += ["## Legacy vs new (means over the 10 source movies)", "",
                  "| diagnostic | legacy | new |", "|---|---|---|"]
        for key in ("mean_plot_raw", "weak_plot_share", "genre_only_share", "mean_genre", "intra_list_diversity"):
            lines.append(f"| {key} | {m.get(key + '_legacy', float('nan')):.3f} | {m.get(key + '_new', float('nan')):.3f} |")
        lines += ["", f"Mean Jaccard overlap of the two top-10 lists: **{m['overlap_jaccard']:.2f}**", "",
                  "`mean_plot_raw` uses the new engine's TF-IDF as yardstick, so it favours the new engine; "
                  "`weak_plot_share` = share of recommendations whose raw plot cosine is below 0.05; "
                  "`genre_only_share` = weak plot AND genre cosine >= 0.5.", "",
                  "### Franchise proxy (title-only heuristic, not ground truth)", "",
                  "| source | franchise titles in dataset | found (legacy) | found (new) |", "|---|---|---|---|"]
        for name, e in summary["comparison"]["per_source"].items():
            lines.append(f"| {name} | {e['franchise_members_in_dataset']} | {e['franchise_found_legacy']} | {e['franchise_found_new']} |")
    if "diversity_experiment" in summary:
        lines += ["", "## Diversity (MMR) experiment", "", f"```\n{json.dumps(summary['diversity_experiment'], indent=2)}\n```"]
    if "ranking_metrics" in summary:
        lines += ["", "## Ranking metrics (from supplied labels)", "", f"```\n{json.dumps(summary['ranking_metrics'], indent=2)}\n```"]
    lines += ["", "## Top-10 lists (legacy | new)", ""]
    for name in new["Source_Movie"].unique():
        n = new[new.Source_Movie == name].sort_values("Rank")
        o = old[old.Source_Movie == name].sort_values("Rank") if old is not None else None
        lines += [f"### {name}", "", "| # | legacy | new | new reasons |", "|---|---|---|---|"]
        for i in range(TOP_K):
            lt = o.iloc[i]["Recommended_Movie"] if o is not None and i < len(o) else ""
            nr = n.iloc[i] if i < len(n) else None
            lines.append(f"| {i + 1} | {lt} | {nr['Recommended_Movie'] if nr is not None else ''} | "
                         f"{(nr['Recommendation_Reasons'] if nr is not None else '')[:110]} |")
        lines.append("")
    return "\n".join(lines)


def run_evaluation(settings: Settings | None = None, out_dir: Path | None = None, labels: Path | None = None,
                   include_legacy: bool = True) -> dict[str, Any]:
    """Run the full evaluation and write every report file. Returns the summary dict."""
    settings = settings or Settings.from_env()
    out_dir = Path(out_dir or settings.reports_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    start = time.perf_counter()
    rec = Recommender.from_settings(settings, force_rebuild=True)
    build_seconds = time.perf_counter() - start

    sources: dict[str, int] = {}
    failed: list[dict[str, str]] = []
    for title in TEST_MOVIES:
        res = rec.searcher.resolve(title)
        if res.status == "resolved":
            sources[title] = int(res.movie_id)
        else:
            failed.append({"query": title, "status": res.status})

    new, runtimes = run_new_engine(rec, sources)
    new[CSV_COLUMNS[:6] + ["Plot_Similarity", "Plot_Similarity_Calibrated"] + CSV_COLUMNS[7:]].to_csv(
        out_dir / "evaluation_top10.csv", index=False)
    summary: dict[str, Any] = {
        "data_quality": rec.dataset.report.to_dict(),
        "settings": {"weights": vars(settings.weights.normalized()), "tfidf": vars(settings.tfidf),
                     "calibrate_plot": settings.calibrate_plot, "plot_reference": rec.features.plot_reference,
                     "partial_evidence_gamma": settings.partial_evidence_gamma},
        "sources": sources, "failed_queries": failed,
        "integrity_new": integrity(new),
        "runtime": {"build_seconds": round(build_seconds, 3),
                    "query_ms_mean": round(float(np.mean(list(runtimes.values()))), 2) if runtimes else None,
                    "query_ms_max": round(float(np.max(list(runtimes.values()))), 2) if runtimes else None},
        "score_distribution": {c: _describe(new[c]) for c in
                               ("Similarity_Score", "Plot_Similarity", "Genre_Similarity", "Director_Similarity")},
    }

    old = None
    if include_legacy:
        old, extra = run_legacy(rec, sources, settings)
        if old is not None:
            old.to_csv(out_dir / "baseline_legacy_top10.csv", index=False)
            summary["runtime"].update({k: round(v, 3) for k, v in extra.items()})
            summary["integrity_legacy"] = integrity(old)
            summary["comparison"] = compare(rec, sources, new, old)

    # diversity experiment: effect of MMR on relevance and intra-list diversity
    div = {}
    for lam in (1.0, 0.8, 0.6):
        frame, _ = run_new_engine(rec, sources, diversity_lambda=lam)
        diag = [_list_diagnostics(rec, rec.dataset.require_index(m),
                                  [rec.dataset.require_index(x) for x in frame[frame.Source_Movie_ID == m]["Recommended_Movie_ID"]])
                for m in sources.values()]
        div[str(lam)] = {"mean_content_score": float(frame["Similarity_Score"].mean()),
                         "mean_intra_list_diversity": float(np.mean([d["intra_list_diversity"] for d in diag])),
                         "mean_plot_raw": float(np.mean([d["mean_plot_raw"] for d in diag]))}
    summary["diversity_experiment"] = div

    if labels is not None:
        gold = load_labels(labels)
        per = {}
        for movie_id, gains in gold.items():
            ranked = new[new.Source_Movie_ID == movie_id].sort_values("Rank")["Recommended_Movie_ID"].tolist()
            if ranked:
                per[movie_id] = {"precision@10": precision_at_k(ranked, gains, 10), "recall@10": recall_at_k(ranked, gains, 10),
                                 "ndcg@10": ndcg_at_k(ranked, gains, 10), "rr": reciprocal_rank(ranked, gains)}
        if per:
            summary["ranking_metrics"] = {"per_source": per, "mean": {
                k: float(np.mean([v[k] for v in per.values()])) for k in ("precision@10", "recall@10", "ndcg@10", "rr")}}

    (out_dir / "evaluation_summary.json").write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    (out_dir / "evaluation_report.md").write_text(_markdown(summary, new, old), encoding="utf-8")
    return summary


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="MOVIEAI evaluation")
    parser.add_argument("--out", type=Path, help="Output directory (default: reports/)")
    parser.add_argument("--labels", type=Path, help="Optional relevance labels CSV")
    parser.add_argument("--no-legacy", action="store_true")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.WARNING)
    summary = run_evaluation(out_dir=args.out, labels=args.labels, include_legacy=not args.no_legacy)
    print(json.dumps({k: summary[k] for k in ("integrity_new", "runtime", "failed_queries")}, indent=2))
    if "comparison" in summary:
        print(json.dumps(summary["comparison"]["mean"], indent=2))
    return 1 if summary["failed_queries"] or summary["integrity_new"]["self_recommendations"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
