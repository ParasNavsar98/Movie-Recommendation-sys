"""Evidence-based recommendation explanations.

Every sentence produced here is backed by a number or a data field that was actually
computed for that exact seed/candidate pair (shared TF-IDF terms, shared genre labels,
a matching director, a configured user preference). Nothing is inferred beyond that, and
no story similarity is ever asserted unless shared plot terms exist.
"""
from __future__ import annotations

import numpy as np

from .data_loader import MovieDataset
from .feature_builder import FeatureSet

PLOT_STRONG = 0.45   # calibrated plot similarity at/above which we say "similar plot themes"
PLOT_SOME = 0.20     # ... and "some plot overlap"
GENRE_MIN = 0.50     # not used for gating shared genres, only for the "close genre profile" wording


class Explainer:
    """Builds human-readable reasons from component scores and shared features."""

    def __init__(self, dataset: MovieDataset, features: FeatureSet) -> None:
        self.dataset = dataset
        self.features = features
        self._terms = (features.vectorizer.get_feature_names_out() if features.vectorizer is not None
                       else np.array([], dtype=object))

    def shared_terms(self, seed_index: int, candidate_index: int, k: int = 5) -> list[str]:
        """Highest-contribution plot terms present in *both* synopses (unigram dropped if inside a chosen bigram)."""
        if not len(self._terms):
            return []
        product = self.features.plot[seed_index].multiply(self.features.plot[candidate_index]).tocoo()
        if product.nnz == 0:
            return []
        order = np.argsort(-product.data, kind="stable")
        chosen: list[str] = []
        # prefer bigrams first, then unigrams not already covered by a chosen bigram
        ranked = [str(self._terms[product.col[i]]) for i in order]
        for term in [t for t in ranked if " " in t] + [t for t in ranked if " " not in t]:
            if any(term == c or (" " not in term and term in c.split()) for c in chosen):
                continue
            chosen.append(term)
            if len(chosen) == k:
                break
        return chosen

    def shared_genres(self, a: int, b: int) -> list[str]:
        gb = set(self.dataset.df["Genre_List"].iat[b])
        return [g for g in self.dataset.df["Genre_List"].iat[a] if g in gb]

    def content_reasons(self, seed_index: int, candidate_index: int, *, plot: float, genre: float, director: float,
                        seed_label: str | None = None) -> list[str]:
        """Reasons a candidate is content-similar to a seed movie."""
        reasons: list[str] = []
        terms = self.shared_terms(seed_index, candidate_index)
        if terms and plot >= PLOT_STRONG:
            reasons.append(f"Similar plot themes (shared terms: {', '.join(terms)})")
        elif terms and plot >= PLOT_SOME:
            reasons.append(f"Some plot overlap (shared terms: {', '.join(terms)})")
        shared = self.shared_genres(seed_index, candidate_index)
        if shared:
            reasons.append(f"Shared genres: {', '.join(shared)}")
        if director > 0:
            seed_dir = self.dataset.df["Director"].iat[seed_index]
            reasons.append(f"Same director: {seed_dir}")
        if not reasons:
            reasons.append("Weak content match; included because few closer candidates remain")
        return reasons

    def preference_reasons(self, source_index: int, candidate_index: int, *, source_label: str, similarity: float,
                           min_similarity: float = 0.25) -> list[str]:
        """Reason tied to a specific movie in the user's history."""
        if source_index < 0 or similarity < min_similarity:
            return []
        title = self.dataset.df["Title"].iat[source_index]
        out = [f"Similar to \u201c{title}\u201d, which you {source_label}"]
        terms = self.shared_terms(source_index, candidate_index, k=3)
        if terms and similarity >= min_similarity:
            out[0] += f" (shared terms: {', '.join(terms)})"
        return out

    def genre_preference_reason(self, candidate_index: int, favorite_genres: list[str]) -> list[str]:
        hit = [g for g in self.dataset.df["Genre_List"].iat[candidate_index] if g in set(favorite_genres)]
        return [f"Matches your favorite genres: {', '.join(hit)}"] if hit else []

    def language_preference_reason(self, candidate_index: int, languages: set[str]) -> list[str]:
        lang = self.dataset.df["Language"].iat[candidate_index]
        if isinstance(lang, str) and lang.strip().casefold() in languages:
            return [f"Matches your preferred language: {lang}"]
        return []
