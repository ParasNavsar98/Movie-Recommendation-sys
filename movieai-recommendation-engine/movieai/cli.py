"""Command-line interface.

    python -m movieai.cli validate
    python -m movieai.cli build [--force]
    python -m movieai.cli search "avengers"
    python -m movieai.cli recommend "Inception" --top 10
    python -m movieai.cli recommend "avengers" --pick 1          # choose from ambiguous matches
    python -m movieai.cli recommend --movie-id 27205 --diversity-lambda 0.7
    python -m movieai.cli recommend "avengers" --first-match      # convenience mode (see below)

Default-match policy: a title is auto-selected **only** when exactly one record has that
exact title (case/accent-insensitive) or a ``(YYYY)`` hint narrows it to one record.
Otherwise the best matches are listed; in an interactive terminal you are prompted to
choose, in a non-interactive shell the command exits with code 2. ``--first-match`` selects
the top-ranked candidate (exact > article-insensitive > prefix > ...) without asking and
prints which movie it chose.
"""
from __future__ import annotations

import argparse
import logging
import sys
from typing import Sequence

from .config import Settings
from .recommender import RecommendationError, Recommender
from .search import SearchHit


def _print_hits(hits: Sequence[SearchHit]) -> None:
    for n, hit in enumerate(hits, 1):
        print(f"  {n:>2}. {hit.label():55s} id={hit.movie_id:<8} [{hit.match_type}] {hit.genres or ''}")


def _choose_movie(rec: Recommender, args: argparse.Namespace) -> int | None:
    if args.movie_id is not None:
        return args.movie_id
    if not args.title:
        print("Provide a title or --movie-id.", file=sys.stderr)
        return None
    resolution = rec.searcher.resolve(args.title)
    if resolution.status == "resolved":
        return resolution.movie_id
    if resolution.status == "not_found":
        print(f"No movie found for '{args.title}'. Try `search`.", file=sys.stderr)
        return None
    hits = resolution.candidates
    if args.pick is not None:
        if not 1 <= args.pick <= len(hits):
            print(f"--pick must be between 1 and {len(hits)}.", file=sys.stderr)
            return None
        return hits[args.pick - 1].movie_id
    if args.first_match:
        print(f"[first-match] Using: {hits[0].label()} (id={hits[0].movie_id})")
        return hits[0].movie_id
    print(f"'{args.title}' matches several movies:")
    _print_hits(hits)
    if sys.stdin.isatty():
        try:
            choice = int(input("Choose a number: ").strip())
            if 1 <= choice <= len(hits):
                return hits[choice - 1].movie_id
        except (ValueError, EOFError):
            pass
        print("Invalid selection.", file=sys.stderr)
    else:
        print("Re-run with --pick N, --movie-id ID, a '(YYYY)' hint, or --first-match.", file=sys.stderr)
    return None


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="movieai", description="MOVIEAI recommendation engine CLI")
    parser.add_argument("--data", help="Path to the enriched CSV (default: data/MOVIEAI_Movies_Enriched_For_Recommendation.csv)")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("validate", help="Print the dataset validation report")
    build = sub.add_parser("build", help="(Re)build and cache model artifacts")
    build.add_argument("--force", action="store_true")
    search = sub.add_parser("search", help="Search titles")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=10)
    rcmd = sub.add_parser("recommend", help="Movies similar to a title / Movie_ID")
    rcmd.add_argument("title", nargs="?")
    rcmd.add_argument("--movie-id", type=int)
    rcmd.add_argument("--top", type=int, default=10)
    rcmd.add_argument("--pick", type=int, help="Choose the Nth candidate of an ambiguous search")
    rcmd.add_argument("--first-match", action="store_true", help="Auto-select the top-ranked candidate")
    rcmd.add_argument("--diversity-lambda", type=float, default=1.0)
    rcmd.add_argument("--language")
    rcmd.add_argument("--components", action="store_true", help="Show component scores")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s %(message)s")
    settings = Settings.from_env(**({"data_path": __import__("pathlib").Path(args.data)} if args.data else {}))
    try:
        if args.command == "validate":
            from .data_loader import load_movies
            print(load_movies(settings.data_path, genre_fallback_primary=settings.genre_fallback_primary).report.format())
            return 0
        rec = Recommender.from_settings(settings, force_rebuild=getattr(args, "force", False))
        if args.command == "build":
            print(f"Artifacts ready in {settings.artifacts_dir} (source: {rec.feature_source}).")
            return 0
        if args.command == "search":
            hits = rec.searcher.search(args.query, args.limit)
            _print_hits(hits) if hits else print("No matches.")
            return 0 if hits else 1
        movie_id = _choose_movie(rec, args)
        if movie_id is None:
            return 2
        result = rec.similar_to(movie_id, args.top, language=args.language, diversity_lambda=args.diversity_lambda)
        seed = rec.dataset.record(rec.dataset.require_index(movie_id))
        print(f"\nMovies similar to {seed['Title']} ({seed['Release_Year']}):")
        for w in result.warnings:
            print(f"  ! {w}")
        for n, item in enumerate(result.items, 1):
            r = item.record
            print(f"{n:>2}. {r['Title']} ({r['Release_Year']})  score={item.score:.3f}  [{r['Genres']}]")
            if args.components:
                print("      " + "  ".join(f"{k}={v:.3f}" for k, v in item.components.items()))
            for reason in item.reasons:
                print(f"      - {reason}")
        return 0
    except (RecommendationError, FileNotFoundError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
