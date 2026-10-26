"""Turn user interactions into preference signals and per-movie preference scores.

This module is independent of the API layer and of how a final ranking is assembled, so it
can be unit-tested with small fixtures.

Signal model (all weights are in :class:`~movieai.config.PersonalizationConfig`)
-------------------------------------------------------------------------------
============  ==============================================================
interaction   treatment
============  ==============================================================
like          positive (+1.0)
favorite      stronger positive (+1.5)
rating        centred on the scale midpoint -> [-1, 1]; 3/5 is *neutral*
dislike       negative (-1.5)
watch_history weak positive (+0.1): exposure, **not** a statement of taste
watchlist     weak positive (+0.2): intent, **not** proof of liking, **not** "watched"
============  ==============================================================

Contributions for one movie are summed and clipped to ``+-weight_clip``. A movie liked and
disliked at the same time is rejected as contradictory input.

Preference score of a candidate ``c`` (in [0, 1])::

    pos(c) = max_share * max_i(w_i * sim(i, c)) + (1 - max_share) * weighted_mean_i(sim(i, c))
    neg(c) = max_j(|w_j| * sim(j, c))
    item_pref(c) = clip(pos(c) - negative_penalty * neg(c), 0, 1)

``sim`` is the same calibrated content score used for "similar movies", ``w`` are
weights scaled by the largest absolute weight. Using the *best* match (not just a
centroid) keeps multi-taste users (e.g. horror + romance) from being averaged into mush;
the bounded ``negative_penalty`` stops dislikes from wiping out the profile.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Iterable, Mapping

import numpy as np

from .config import PersonalizationConfig
from .data_loader import MovieDataset
from .preprocessor import parse_genres
from .similarity_engine import SimilarityEngine

logger = logging.getLogger(__name__)
MAX_SIGNAL_MOVIES = 300  # cap on movies used per side, strongest weights first


@dataclass
class UserProfile:
    """Plain-Python user profile (the API layer converts its Pydantic model into this)."""

    likes: list[int] = field(default_factory=list)
    dislikes: list[int] = field(default_factory=list)
    favorites: list[int] = field(default_factory=list)
    watchlist: list[int] = field(default_factory=list)
    watch_history: list[int] = field(default_factory=list)
    ratings: dict[int, float] = field(default_factory=dict)
    favorite_genres: list[str] = field(default_factory=list)
    preferred_languages: list[str] = field(default_factory=list)

    def validate(self, cfg: PersonalizationConfig) -> None:
        conflict = (set(self.likes) | set(self.favorites)) & set(self.dislikes)
        if conflict:
            raise ValueError(f"Movies cannot be both liked/favorited and disliked: {sorted(conflict)}")
        for movie_id, rating in self.ratings.items():
            if not (cfg.rating_min <= rating <= cfg.rating_max):
                raise ValueError(f"Rating {rating} for movie {movie_id} is outside [{cfg.rating_min}, {cfg.rating_max}].")

    @property
    def is_empty(self) -> bool:
        return not (self.likes or self.dislikes or self.favorites or self.watchlist or self.watch_history
                    or self.ratings or self.favorite_genres or self.preferred_languages)


@dataclass
class Signal:
    """Combined interaction weight for one known movie."""

    movie_id: int
    index: int
    weight: float
    sources: list[str]


@dataclass
class SignalSet:
    positive: list[Signal]
    negative: list[Signal]
    unknown_ids: list[int]
    seen_ids: set[int]          # watched = history + likes + favorites + rated
    watchlist_ids: set[int]
    disliked_ids: set[int]
    genres: list[str]           # canonical favorite genres
    unknown_genres: list[str]
    languages: set[str]         # case-folded

    @property
    def has_item_signal(self) -> bool:
        return bool(self.positive)


def normalize_rating(rating: float, cfg: PersonalizationConfig) -> float:
    """Map a rating on [rating_min, rating_max] to [-1, 1] around the scale midpoint."""
    mid = (cfg.rating_min + cfg.rating_max) / 2.0
    half = (cfg.rating_max - cfg.rating_min) / 2.0
    return float(np.clip((rating - mid) / half, -1.0, 1.0)) if half > 0 else 0.0


def build_signals(profile: UserProfile, dataset: MovieDataset, cfg: PersonalizationConfig,
                  known_genres: Iterable[str] = ()) -> SignalSet:
    """Convert a profile into weighted signals. Unknown Movie_IDs are reported, never fatal."""
    profile.validate(cfg)
    contributions: dict[int, list[tuple[str, float]]] = {}

    def add(ids: Iterable[int], source: str, weight: float) -> None:
        for movie_id in ids:
            contributions.setdefault(int(movie_id), []).append((source, weight))

    add(profile.likes, "liked", cfg.like_weight)
    add(profile.favorites, "favorited", cfg.favorite_weight)
    add(profile.dislikes, "disliked", cfg.dislike_weight)
    add(profile.watch_history, "watched", cfg.watch_history_weight)
    add(profile.watchlist, "watchlisted", cfg.watchlist_weight)
    for movie_id, rating in profile.ratings.items():
        add([movie_id], f"rated {rating:g}", normalize_rating(rating, cfg) * cfg.rating_weight)

    positive, negative, unknown = [], [], []
    for movie_id, items in contributions.items():
        index = dataset.index_of(movie_id)
        if index is None:
            unknown.append(movie_id)
            continue
        weight = float(np.clip(sum(w for _, w in items), -cfg.weight_clip, cfg.weight_clip))
        signal = Signal(movie_id, index, weight, [s for s, _ in items])
        if weight > 1e-9:
            positive.append(signal)
        elif weight < -1e-9:
            negative.append(signal)
    positive.sort(key=lambda s: (-s.weight, s.movie_id))
    negative.sort(key=lambda s: (s.weight, s.movie_id))

    genres, unknown_genres = [], []
    known = set(known_genres)
    for genre in parse_genres("|".join(profile.favorite_genres)):
        (genres if not known or genre in known else unknown_genres).append(genre)

    known_ids = {m for m in contributions if dataset.index_of(m) is not None}
    watched = (set(profile.watch_history) | set(profile.likes) | set(profile.favorites) | set(profile.ratings)) & known_ids
    return SignalSet(
        positive=positive[:MAX_SIGNAL_MOVIES], negative=negative[:MAX_SIGNAL_MOVIES], unknown_ids=sorted(unknown),
        seen_ids=watched, watchlist_ids=set(profile.watchlist) & known_ids,
        disliked_ids=set(profile.dislikes) & known_ids, genres=genres, unknown_genres=unknown_genres,
        languages={lang.strip().casefold() for lang in profile.preferred_languages if lang.strip()},
    )


@dataclass
class ItemPreference:
    """Per-candidate output of :func:`item_preference` (all arrays have length n)."""

    score: np.ndarray            # clipped to [0, 1]
    positive: np.ndarray
    negative: np.ndarray
    best_source: np.ndarray      # index into ``SignalSet.positive`` of the strongest match
    best_similarity: np.ndarray  # raw content similarity to that source movie


def item_preference(signals: SignalSet, engine: SimilarityEngine, cfg: PersonalizationConfig) -> ItemPreference:
    """Similarity of every movie to the user's positive items minus a bounded dislike penalty."""
    n = engine.n
    zeros = np.zeros(n)
    if not signals.positive:
        return ItemPreference(zeros, zeros, zeros, np.full(n, -1), zeros)
    idx = [s.index for s in signals.positive]
    w = np.array([s.weight for s in signals.positive])
    w_scaled = w / np.max(np.abs(w))
    sims, _ = engine.similarity(idx)
    weighted = sims * w_scaled[:, None]
    best = weighted.max(axis=0)
    mean = weighted.sum(axis=0) / w_scaled.sum()
    positive = cfg.max_share * best + (1 - cfg.max_share) * mean

    negative = zeros
    if signals.negative:
        nidx = [s.index for s in signals.negative]
        nw = np.abs(np.array([s.weight for s in signals.negative]))
        nsims, _ = engine.similarity(nidx)
        negative = (nsims * (nw / nw.max())[:, None]).max(axis=0)
    score = np.clip(positive - cfg.negative_penalty * negative, 0.0, 1.0)
    arg = weighted.argmax(axis=0)
    return ItemPreference(score, positive, negative, arg, sims[arg, np.arange(n)])


def genre_match(dataset: MovieDataset, genres: list[str]) -> np.ndarray:
    """Cosine between each movie's binary genre set and the favorite-genre set."""
    if not genres:
        return np.zeros(len(dataset))
    fav = set(genres)
    out = np.zeros(len(dataset))
    for i, gl in enumerate(dataset.df["Genre_List"].tolist()):
        if gl:
            out[i] = len(fav.intersection(gl)) / np.sqrt(len(gl) * len(fav))
    return out


def language_match(dataset: MovieDataset, languages: set[str]) -> np.ndarray:
    """1.0 where the movie's ``Language`` is one of the preferred languages."""
    if not languages:
        return np.zeros(len(dataset))
    return dataset.df["Language"].map(lambda v: float(isinstance(v, str) and v.strip().casefold() in languages)).to_numpy()


def profile_preference(signals: SignalSet, dataset: MovieDataset, engine: SimilarityEngine,
                       cfg: PersonalizationConfig) -> tuple[np.ndarray, ItemPreference, np.ndarray, np.ndarray]:
    """Blend item, favorite-genre and preferred-language preference into one [0, 1] score.

    Only the components the user actually supplied take part; weights are re-normalised
    over those (item weight = 1 - genre weight - language weight).
    Returns ``(score, item_pref, genre_match, language_match)``.
    """
    item = item_preference(signals, engine, cfg)
    g = genre_match(dataset, signals.genres)
    lang = language_match(dataset, signals.languages)
    parts = []
    if signals.has_item_signal:
        parts.append((max(1.0 - cfg.favorite_genre_weight - cfg.preferred_language_weight, 0.05), item.score))
    if signals.genres:
        parts.append((cfg.favorite_genre_weight, g))
    if signals.languages:
        parts.append((cfg.preferred_language_weight, lang))
    if not parts:
        return np.zeros(len(dataset)), item, g, lang
    total = sum(w for w, _ in parts)
    return np.clip(sum(w * s for w, s in parts) / total, 0.0, 1.0), item, g, lang


def genre_taste_similarity(signals: SignalSet, engine: SimilarityEngine) -> np.ndarray:
    """Cosine between each movie's genre vector and the user's weighted liked-genre profile."""
    if not signals.positive:
        return np.zeros(engine.n)
    g = engine.features.genre
    weights = np.array([s.weight for s in signals.positive])
    profile = np.asarray(g[[s.index for s in signals.positive]].T @ weights).ravel()
    norm = np.linalg.norm(profile)
    if norm == 0:
        return np.zeros(engine.n)
    return np.clip(np.asarray(g @ (profile / norm)).ravel(), 0.0, 1.0)
