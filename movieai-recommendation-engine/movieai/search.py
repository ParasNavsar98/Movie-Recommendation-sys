"""Title search and ambiguity resolution.

Search is purely lexical and is intentionally independent of the recommendation
similarity: *the similarity algorithm is never used to guess which movie the user meant.*

Match tiers (best first); within a tier results are ordered by ``Vote_Count`` (a
disambiguation heuristic only), then year, then ``Movie_ID``:

====  =======================================================================
tier  meaning
====  =======================================================================
0     exact title (case- and accent-insensitive)
1     exact after dropping a leading article / punctuation (``Avengers`` ~ ``The Avengers``)
2     title starts with the query (``Avengers: Age of Ultron``)
3     every query word appears in the title
4     query is a substring of the title (spacing/punctuation-insensitive)
5     fuzzy match (typos), only used when nothing else matched
====  =======================================================================

``resolve()`` auto-selects a movie **only** for a unique tier-0 match (or when a
``(YYYY)`` year hint narrows it to one record); everything else is reported as ambiguous
so the caller (CLI / frontend) can ask the user.
"""
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from typing import Any

from .data_loader import MovieDataset
from .preprocessor import fold_text, normalize_title, title_key

MATCH_TYPES = {0: "exact", 1: "exact_normalized", 2: "prefix", 3: "all_words", 4: "substring", 5: "fuzzy"}
_YEAR_HINT = re.compile(r"\s*\(\s*(\d{4})\s*\)\s*$")


@dataclass
class SearchHit:
    movie_id: int
    title: str
    year: int | None
    genres: str | None
    poster_web_path: str | None
    poster_path: str | None
    match_type: str
    tier: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "Movie_ID": self.movie_id, "Title": self.title, "Release_Year": self.year,
            "Genres": self.genres, "Poster_Web_Path": self.poster_web_path,
            "poster_path": self.poster_path, "Match_Type": self.match_type,
        }

    def label(self) -> str:
        return f"{self.title} ({self.year})" if self.year else self.title


@dataclass
class Resolution:
    """Outcome of trying to map a user query to exactly one movie."""

    status: str  # "resolved" | "ambiguous" | "not_found"
    movie_id: int | None = None
    candidates: list[SearchHit] = field(default_factory=list)


class TitleSearcher:
    """Pre-indexes titles once; every search is a cheap in-memory scan."""

    def __init__(self, dataset: MovieDataset) -> None:
        df = dataset.df
        self.dataset = dataset
        self._titles = df["Title"].tolist()
        self._folded = [fold_text(t) for t in self._titles]
        self._norm = [normalize_title(t) for t in self._titles]
        self._keys = [title_key(t) for t in self._titles]
        self._token_sets = [set(n.split()) for n in self._norm]
        self._years = [None if y != y else int(y) for y in df["Year"].tolist()]
        votes = df["Vote_Count"].fillna(0).tolist()
        self._votes = votes
        self._ids = df["Movie_ID"].astype(int).tolist()
        self._genres = df["Genres_Clean"].tolist()
        self._poster_web = [p if isinstance(p, str) and p.startswith("/") else None for p in df["Poster_Web_Path"].tolist()]
        self._poster = [p if isinstance(p, str) and p.startswith("/") else None for p in df["poster_path"].tolist()]
        by_key: dict[str, list[int]] = {}
        for i, k in enumerate(self._keys):
            by_key.setdefault(k, []).append(i)
        self._by_key = by_key

    def _hit(self, i: int, tier: int) -> SearchHit:
        return SearchHit(
            movie_id=self._ids[i], title=self._titles[i], year=self._years[i], genres=self._genres[i] or None,
            poster_web_path=self._poster_web[i], poster_path=self._poster[i],
            match_type=MATCH_TYPES[tier], tier=tier,
        )

    def _order(self, i: int) -> tuple:
        return (-self._votes[i], self._years[i] or 9999, self._ids[i])

    @staticmethod
    def split_year_hint(query: str) -> tuple[str, int | None]:
        """``"Batman (1989)"`` -> ``("Batman", 1989)``."""
        match = _YEAR_HINT.search(query)
        if not match:
            return query.strip(), None
        return query[: match.start()].strip(), int(match.group(1))

    def search(self, query: str, limit: int = 10) -> list[SearchHit]:
        """Return up to ``limit`` candidates, best match first. Empty list if none."""
        if not isinstance(query, str) or not query.strip():
            raise ValueError("Search query must not be empty.")
        if limit < 1:
            raise ValueError("limit must be at least 1.")
        text, year = self.split_year_hint(query)
        q_fold, q_norm, q_key = fold_text(text), normalize_title(text), title_key(text)
        if not q_key:
            return []
        q_tokens = set(q_norm.split())

        tiers: dict[int, list[int]] = {t: [] for t in range(5)}
        for i in range(len(self._titles)):
            if year is not None and self._years[i] != year:
                continue
            if self._folded[i] == q_fold:
                tiers[0].append(i)
            elif self._keys[i] == q_key:
                tiers[1].append(i)
            elif self._norm[i].startswith(q_norm + " "):
                tiers[2].append(i)
            elif q_tokens and q_tokens <= self._token_sets[i]:
                tiers[3].append(i)
            elif len(q_key) >= 3 and q_key in self._keys[i]:
                tiers[4].append(i)

        hits: list[SearchHit] = []
        for tier in range(5):
            for i in sorted(tiers[tier], key=self._order):
                hits.append(self._hit(i, tier))
        if not hits:  # typo tolerance as a last resort
            allowed_years = year
            for key in difflib.get_close_matches(q_key, list(self._by_key), n=limit, cutoff=0.8):
                for i in sorted(self._by_key[key], key=self._order):
                    if allowed_years is None or self._years[i] == allowed_years:
                        hits.append(self._hit(i, 5))
        return hits[:limit]

    def resolve(self, query: str) -> Resolution:
        """Map a query to one movie *only* when that is unambiguous (see module docstring)."""
        hits = self.search(query, limit=10)
        if not hits:
            return Resolution("not_found")
        exact = [h for h in hits if h.tier == 0]
        _, year = self.split_year_hint(query)
        if len(exact) == 1:
            return Resolution("resolved", exact[0].movie_id, hits)
        if year is not None and len(hits) == 1:
            return Resolution("resolved", hits[0].movie_id, hits)
        return Resolution("ambiguous", None, hits)
