"""Recommendation orchestration: similar-movie, personalized and discovery modes.

Pipeline for every mode
-----------------------
1. *Relevance* vector over all movies (content score, preference score, or a blend).
2. Optional transparent re-ranking signals (:class:`~movieai.config.RankingConfig`).
3. Eligibility mask (seed, exclusions, language filter, minimum score).
4. Candidate pool -> optional MMR diversification -> top ``limit``.
5. Evidence-based reasons for the selected movies only.

Ordering is fully deterministic: ties are broken by raw plot similarity, then ``Movie_ID``.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Iterable, Sequence

import numpy as np

from .config import RankingConfig, Settings
from .data_loader import MovieDataset, load_movies
from .explanations import Explainer
from .feature_builder import FeatureSet, get_features
from .personalization import (
    SignalSet, UserProfile, build_signals, genre_taste_similarity, item_preference, profile_preference,
)
from .search import TitleSearcher
from .similarity_engine import SimilarityEngine

logger = logging.getLogger(__name__)
MODES = ("profile", "seed", "multi_seed", "discovery")


class RecommendationError(ValueError):
    """Invalid recommendation request (unknown movie, bad parameter, ...)."""


@dataclass
class Recommendation:
    movie_id: int
    index: int
    score: float
    components: dict[str, float]
    ranking_components: dict[str, float]
    reasons: list[str]
    record: dict[str, Any]


@dataclass
class RecommendationResult:
    items: list[Recommendation]
    mode: str
    seed_movie_id: int | None = None
    fallback_reason: str | None = None
    warnings: list[str] = field(default_factory=list)
    excluded_count: int = 0
    candidates_considered: int = 0


class Recommender:
    """High-level engine. Construct once (see :meth:`from_settings`) and reuse."""

    def __init__(self, dataset: MovieDataset, features: FeatureSet, settings: Settings,
                 feature_source: str = "provided") -> None:
        self.dataset, self.features, self.settings = dataset, features, settings
        self.feature_source = feature_source
        self.engine = SimilarityEngine(features, settings.weights, calibrate_plot=settings.calibrate_plot,
                                       partial_evidence_gamma=settings.partial_evidence_gamma)
        self.searcher = TitleSearcher(dataset)
        self.explainer = Explainer(dataset, features)
        self._ids = dataset.df["Movie_ID"].to_numpy(dtype=np.int64)
        self._languages = dataset.df["Language"].map(lambda v: v.strip().casefold() if isinstance(v, str) else "").to_numpy()
        self._years = dataset.df["Year"].to_numpy(dtype=float)
        self._runtime = dataset.df["Runtime_Min"].to_numpy(dtype=float)
        self._quality = self._bayesian_quality(settings.ranking)
        self._popularity_pct = self._percentile(dataset.df["Popularity"].to_numpy(dtype=float))
        self._votes_pct = self._percentile(dataset.df["Vote_Count"].to_numpy(dtype=float))
        self._votes = dataset.df["Vote_Count"].fillna(0).to_numpy(dtype=float)

    # ----------------------------------------------------------------- construction
    @classmethod
    def from_settings(cls, settings: Settings | None = None, *, force_rebuild: bool = False) -> "Recommender":
        """Load the CSV, load/build artifacts once, and return a ready engine."""
        settings = settings or Settings.from_env()
        dataset = load_movies(settings.data_path, genre_fallback_primary=settings.genre_fallback_primary)
        logger.info("\n%s", dataset.report.format())
        features, source = get_features(dataset, settings, force_rebuild=force_rebuild)
        return cls(dataset, features, settings, feature_source=source)

    def health(self) -> dict[str, Any]:
        r = self.dataset.report
        return {
            "status": "ok", "movies": r.records, "feature_source": self.feature_source,
            "plot_vocabulary_size": self.features.info.get("plot_vocabulary_size"),
            "weights": vars(self.engine.weights), "dataset_sha256": r.source_sha256[:16],
        }

    # ----------------------------------------------------------------- ranking helpers
    def _bayesian_quality(self, cfg: RankingConfig) -> np.ndarray:
        """Vote_Average shrunk toward the global mean for low vote counts, scaled to [0, 1]."""
        r = self.dataset.df["Vote_Average"].to_numpy(dtype=float)
        v = self.dataset.df["Vote_Count"].fillna(0).to_numpy(dtype=float)
        valid = ~np.isnan(r)
        mean = float(np.average(r[valid], weights=np.maximum(v[valid], 1))) if valid.any() else 5.0
        r = np.where(valid, r, mean)
        m = float(cfg.bayes_min_votes)
        return np.clip((v / (v + m) * r + m / (v + m) * mean) / 10.0, 0.0, 1.0)

    @staticmethod
    def _percentile(values: np.ndarray) -> np.ndarray:
        values = np.nan_to_num(values, nan=0.0)
        order = values.argsort(kind="stable").argsort(kind="stable")
        return order / max(len(values) - 1, 1)

    def _ranking_signals(self, seed_index: int | None) -> dict[str, np.ndarray]:
        """Enabled optional signals only (weight > 0), each an array in [0, 1]."""
        cfg, signals = self.settings.ranking, {}
        n = len(self.dataset)
        if cfg.quality_weight > 0:
            signals["quality"] = self._quality
        if cfg.popularity_weight > 0:
            signals["popularity"] = self._popularity_pct
        if cfg.vote_count_weight > 0:
            signals["vote_count"] = self._votes_pct
        if seed_index is not None:
            if cfg.year_weight > 0:
                d = np.abs(self._years - self._years[seed_index])
                signals["year_proximity"] = np.where(np.isnan(d), 0.5, np.exp(-d / cfg.year_scale))
            if cfg.language_weight > 0:
                signals["language_match"] = (self._languages == self._languages[seed_index]).astype(float)
            if cfg.runtime_weight > 0:
                d = np.abs(self._runtime - self._runtime[seed_index])
                signals["runtime_proximity"] = np.where(np.isnan(d), 0.5, np.exp(-d / cfg.runtime_scale))
        return {k: np.nan_to_num(v, nan=0.0) if len(v) == n else np.zeros(n) for k, v in signals.items()}

    def _blend_ranking(self, relevance: np.ndarray, signals: dict[str, np.ndarray]) -> np.ndarray:
        cfg = self.settings.ranking
        weight_of = {"quality": cfg.quality_weight, "popularity": cfg.popularity_weight,
                     "vote_count": cfg.vote_count_weight, "year_proximity": cfg.year_weight,
                     "language_match": cfg.language_weight, "runtime_proximity": cfg.runtime_weight}
        total = 1.0 + sum(weight_of[k] for k in signals)
        return (relevance + sum(weight_of[k] * v for k, v in signals.items())) / total

    def _select(self, rank: np.ndarray, eligible: np.ndarray, tiebreak: np.ndarray, limit: int,
                diversity_lambda: float) -> list[int]:
        """Deterministic top-``limit`` with optional MMR (``diversity_lambda`` in [0, 1]; 1 = off)."""
        cand = np.flatnonzero(eligible & np.isfinite(rank))
        if cand.size == 0:
            return []
        order = np.lexsort((self._ids[cand], -tiebreak[cand], -rank[cand]))
        cand = cand[order]
        if diversity_lambda >= 1.0:
            return cand[:limit].tolist()
        cfg = self.settings.ranking
        pool = cand[: max(cfg.min_pool, limit * cfg.pool_multiplier)]
        sim = self.engine.pairwise_among(pool)
        rel = rank[pool]
        chosen = [0]
        remaining = list(range(1, len(pool)))
        while remaining and len(chosen) < limit:
            max_sim = sim[np.ix_(remaining, chosen)].max(axis=1)
            mmr = diversity_lambda * rel[remaining] - (1 - diversity_lambda) * max_sim
            chosen.append(remaining.pop(int(np.argmax(mmr))))  # argmax -> first (best-ranked) on ties
        return pool[chosen].tolist()

    # ----------------------------------------------------------------- validation
    @staticmethod
    def _check_params(limit: int, diversity_lambda: float) -> None:
        if not isinstance(limit, (int, np.integer)) or limit < 1:
            raise RecommendationError("limit must be an integer >= 1.")
        if not 0.0 <= diversity_lambda <= 1.0:
            raise RecommendationError("diversity_lambda must be between 0 and 1.")

    def _index(self, movie_id: int) -> int:
        idx = self.dataset.index_of(movie_id)
        if idx is None:
            raise RecommendationError(f"Unknown Movie_ID: {movie_id}")
        return idx

    def _language_mask(self, language: str | None) -> np.ndarray:
        if not language:
            return np.ones(len(self.dataset), dtype=bool)
        return self._languages == language.strip().casefold()

    def _mask_ids(self, mask: np.ndarray, ids: Iterable[int]) -> int:
        removed = 0
        for movie_id in ids:
            idx = self.dataset.index_of(movie_id)
            if idx is not None and mask[idx]:
                mask[idx] = False
                removed += 1
        return removed

    def _record(self, idx: int, score: float, comps: dict[str, float], ranking: dict[str, float],
                reasons: list[str]) -> Recommendation:
        return Recommendation(int(self._ids[idx]), idx, float(score), comps, ranking, reasons, self.dataset.record(idx))

    # ----------------------------------------------------------------- mode 1: similar to a movie
    def similar_to(self, movie_id: int, limit: int = 10, *, exclude_ids: Iterable[int] = (), language: str | None = None,
                   diversity_lambda: float = 1.0, min_score: float = 0.0) -> RecommendationResult:
        """Movies most similar in content to ``movie_id`` (never the movie itself)."""
        self._check_params(limit, diversity_lambda)
        seed = self._index(movie_id)
        sims, comps = self.engine.similarity([seed])
        content, raw_plot = sims[0], comps.plot_raw[0]
        signals = self._ranking_signals(seed)
        rank = self._blend_ranking(content, signals)

        warnings: list[str] = []
        if not self.features.plot_available[seed]:
            warnings.append("Seed movie has no usable description; ranked by genre and director only.")
        if not (self.features.genre_available[seed] or self.features.plot_available[seed]
                or self.features.director_available[seed]):
            warnings.append("Seed movie has no usable content data; no recommendations can be produced.")
        eligible = self._language_mask(language)
        eligible[seed] = False
        excluded = self._mask_ids(eligible, exclude_ids)
        eligible &= content >= max(min_score, 1e-12) if min_score > 0 else content > 0
        picks = self._select(rank, eligible, raw_plot, limit, diversity_lambda)

        items = []
        for idx in picks:
            parts = {"content": float(content[idx]), "plot": float(comps.plot[0, idx]),
                     "plot_raw": float(comps.plot_raw[0, idx]), "genre": float(comps.genre[0, idx]),
                     "director": float(comps.director[0, idx])}
            reasons = self.explainer.content_reasons(seed, idx, plot=parts["plot"], genre=parts["genre"],
                                                     director=parts["director"])
            items.append(self._record(idx, rank[idx], parts, {k: float(v[idx]) for k, v in signals.items()}, reasons))
        return RecommendationResult(items, "similar", int(movie_id), None, warnings, excluded, int(eligible.sum()))

    # ----------------------------------------------------------------- personalized modes
    def personalized(
        self, profile: UserProfile, *, mode: str = "profile", seed_movie_id: int | None = None,
        seed_movie_ids: Sequence[int] = (), limit: int = 10, exclude_watched: bool = True,
        exclude_watchlist: bool = False, exclude_disliked: bool = True, override_exclusions: Iterable[int] = (),
        language: str | None = None, diversity_lambda: float = 1.0,
    ) -> RecommendationResult:
        """Personalized recommendations.

        Modes: ``profile`` (taste only), ``seed`` (70 % content to one movie + 30 % taste),
        ``multi_seed`` (several explicit seed movies), ``discovery`` (taste + genre novelty,
        quality-gated). Exclusion flags can be overridden per movie via ``override_exclusions``.
        """
        if mode not in MODES:
            raise RecommendationError(f"Unknown mode '{mode}'. Choose one of {list(MODES)}.")
        self._check_params(limit, diversity_lambda)
        pcfg = self.settings.personalization
        try:
            signals = build_signals(profile, self.dataset, pcfg, self.features.genre_labels)
        except ValueError as exc:
            raise RecommendationError(str(exc)) from exc
        warnings: list[str] = []
        if signals.unknown_ids:
            warnings.append(f"Ignored {len(signals.unknown_ids)} unknown Movie_ID value(s) in the profile.")
        if signals.unknown_genres:
            warnings.append(f"Ignored unrecognised favorite genre(s): {', '.join(signals.unknown_genres)}.")

        n = len(self.dataset)
        fallback: str | None = None
        seed_idx: int | None = None
        seed_ids_idx: list[int] = []
        if mode == "seed":
            if seed_movie_id is None:
                raise RecommendationError("mode 'seed' requires seed_movie_id.")
            seed_idx = self._index(seed_movie_id)
        if mode == "multi_seed":
            if not seed_movie_ids:
                raise RecommendationError("mode 'multi_seed' requires seed_movie_ids.")
            seed_ids_idx = [self._index(m) for m in dict.fromkeys(seed_movie_ids)]

        content = np.zeros(n)
        comps_seed = None
        pref = np.zeros(n)
        item = genre_m = lang_m = None
        novelty = np.zeros(n)
        tiebreak = np.zeros(n)
        mode_used = mode

        has_taste = signals.has_item_signal or bool(signals.genres) or bool(signals.languages)
        if mode == "multi_seed":
            seed_profile = UserProfile(likes=[int(self._ids[i]) for i in seed_ids_idx],
                                       dislikes=[int(m) for m in profile.dislikes],
                                       favorite_genres=profile.favorite_genres,
                                       preferred_languages=profile.preferred_languages)
            seed_signals = build_signals(seed_profile, self.dataset, pcfg, self.features.genre_labels)
            pref, item, genre_m, lang_m = profile_preference(seed_signals, self.dataset, self.engine, pcfg)
            relevance = pref
            reason_signals = seed_signals
        else:
            pref, item, genre_m, lang_m = profile_preference(signals, self.dataset, self.engine, pcfg)
            reason_signals = signals
            if mode == "seed":
                sims, comps_seed = self.engine.similarity([seed_idx])
                content, tiebreak = sims[0], comps_seed.plot_raw[0]
                if has_taste:
                    cw, pw = pcfg.content_weight, pcfg.preference_weight
                    relevance = (cw * content + pw * pref) / (cw + pw)
                else:
                    relevance, fallback = content, "no_user_history: content-only similarity to the seed movie"
            elif mode == "discovery":
                if signals.has_item_signal:
                    novelty = 1.0 - genre_taste_similarity(signals, self.engine)
                    nw = pcfg.discovery_novelty_weight
                    relevance = (1 - nw) * pref + nw * novelty * (pref > 0)
                else:
                    relevance, fallback, mode_used = self._quality_baseline(profile, signals), \
                        "no_user_history: ranked by quality and any stated genre/language preference", "discovery"
            else:  # profile
                relevance = pref if has_taste else self._quality_baseline(profile, signals)
                if not has_taste:
                    fallback = "no_user_history: ranked by quality (no seed movie or stated preference)"

        signals_rank = self._ranking_signals(seed_idx)
        rank = self._blend_ranking(np.clip(relevance, 0.0, 1.0), signals_rank)

        eligible = self._language_mask(language)
        excluded = 0
        overrides = {int(m) for m in override_exclusions}
        for flag, ids in ((exclude_watched, signals.seen_ids), (exclude_watchlist, signals.watchlist_ids),
                          (exclude_disliked, signals.disliked_ids)):
            if flag:
                excluded += self._mask_ids(eligible, set(ids) - overrides)
        if seed_idx is not None:
            eligible[seed_idx] = False
        for i in seed_ids_idx:
            eligible[i] = False
        if mode == "discovery":
            quality_ok = (self._quality >= pcfg.discovery_min_quality) & (self._votes >= pcfg.discovery_min_votes)
            eligible &= quality_ok
        eligible &= rank > 0
        picks = self._select(rank, eligible, tiebreak if mode == "seed" else item.best_similarity
                             if item is not None and signals.has_item_signal else tiebreak, limit, diversity_lambda)

        items = []
        for idx in picks:
            parts: dict[str, float] = {"preference": float(pref[idx])}
            reasons: list[str] = []
            if mode == "seed" and comps_seed is not None:
                parts.update({"content": float(content[idx]), "plot": float(comps_seed.plot[0, idx]),
                              "plot_raw": float(comps_seed.plot_raw[0, idx]), "genre": float(comps_seed.genre[0, idx]),
                              "director": float(comps_seed.director[0, idx])})
                reasons += self.explainer.content_reasons(seed_idx, idx, plot=parts["plot"], genre=parts["genre"],
                                                          director=parts["director"])
            if item is not None and reason_signals.has_item_signal:
                parts["item_preference"] = float(item.score[idx])
                src = int(item.best_source[idx])
                if src >= 0:
                    sig = reason_signals.positive[src]
                    label = {"liked": "liked", "favorited": "favorited", "watched": "watched",
                             "watchlisted": "added to your watchlist"}.get(sig.sources[0], sig.sources[0])
                    reasons += self.explainer.preference_reasons(sig.index, idx, source_label=label,
                                                                 similarity=float(item.best_similarity[idx]))
            if genre_m is not None and reason_signals.genres:
                parts["favorite_genre_match"] = float(genre_m[idx])
                reasons += self.explainer.genre_preference_reason(idx, reason_signals.genres)
            if lang_m is not None and reason_signals.languages:
                reasons += self.explainer.language_preference_reason(idx, reason_signals.languages)
            if mode == "discovery":
                parts["novelty"] = float(novelty[idx])
                if novelty[idx] > 0.5:
                    reasons.append("Outside your most-liked genres but close to movies you liked")
            if mode == "profile" and fallback:
                parts["quality"] = float(self._quality[idx])
                reasons.append("Highly rated across many votes (no personal history available)")
            if not reasons:
                reasons.append("Weak match to your profile; included because few closer candidates remain")
            items.append(self._record(idx, rank[idx], parts, {k: float(v[idx]) for k, v in signals_rank.items()}, reasons))
        return RecommendationResult(items, mode_used, int(seed_movie_id) if seed_movie_id is not None else None,
                                    fallback, warnings, excluded, int(eligible.sum()))

    def _quality_baseline(self, profile: UserProfile, signals: SignalSet) -> np.ndarray:
        """Cold-start relevance: Bayesian quality, filtered/boosted by any stated genre/language preference."""
        base = self._quality.copy()
        if signals.genres:
            base = base * (0.5 + 0.5 * np.clip(np.nan_to_num(profile_preference(
                signals, self.dataset, self.engine, self.settings.personalization)[2]), 0, 1))
        if signals.languages:
            base = base * np.where(self._languages_match(signals.languages), 1.0, 0.6)
        return base

    def _languages_match(self, languages: set[str]) -> np.ndarray:
        return np.isin(self._languages, list(languages))
