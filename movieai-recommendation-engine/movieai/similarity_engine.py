"""Component similarities and the weighted content score.

Scoring formula (for a pair of movies ``i`` and ``j``)
------------------------------------------------------
Each signal ``k`` in {plot, genre, director} has a similarity ``s_k`` in [0, 1] and a
configured weight ``w_k``. A signal is *available for the pair* only if **both** movies
have the underlying data (``a_k(i, j) = 1``)::

    W_pair  = sum_k w_k * a_k(i, j)           # weight actually backed by data
    W_seed  = sum_k w_k * a_k(i)              # weight the seed movie could ever use
    content = (sum_k w_k * a_k(i, j) * s_k) / W_pair  *  (W_pair / W_seed) ** gamma

* The first factor re-normalises over the *available* signals, so a seed without a
  description is scored on genre + director alone, and no candidate is penalised for it.
* The second factor is a mild confidence discount applied only when the *candidate* lacks
  a signal the seed has (otherwise a candidate with no synopsis and matching genres would
  score 0.95 on genre alone). ``gamma = 1`` (default) means "no evidence, no credit" for candidate-side gaps; ``gamma = 0`` disables the discount.
* ``s_plot`` is the TF-IDF cosine divided by a corpus reference value (when calibration is
  on) and clipped to [0, 1]. Raw TF-IDF cosines between related synopses are typically
  0.1-0.3, while genre cosine reaches 1.0, so without calibration the 25 % genre weight
  silently out-votes the 70 % plot weight.

The result is always finite and in [0, 1]. Raw (uncalibrated) plot cosine is also kept.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np

from .config import SimilarityWeights
from .feature_builder import FeatureSet


@dataclass
class Components:
    """Dense ``(len(rows), len(cols))`` component arrays."""

    plot_raw: np.ndarray
    plot: np.ndarray      # calibrated plot similarity actually used in the score
    genre: np.ndarray
    director: np.ndarray
    plot_ok: np.ndarray   # pair-level availability masks
    genre_ok: np.ndarray
    director_ok: np.ndarray


class SimilarityEngine:
    """Computes component similarities on demand from sparse matrices (no n x n cache)."""

    def __init__(
        self,
        features: FeatureSet,
        weights: SimilarityWeights,
        *,
        calibrate_plot: bool = True,
        partial_evidence_gamma: float = 1.0,
    ) -> None:
        if partial_evidence_gamma < 0:
            raise ValueError("partial_evidence_gamma must be >= 0")
        self.features = features
        self.weights = weights.normalized()
        self.calibrate_plot = calibrate_plot
        self.gamma = partial_evidence_gamma
        self._plot_t = features.plot.T.tocsc()
        self._genre_t = features.genre.T.tocsc()
        self._dir_t = features.director.T.tocsc()

    @property
    def n(self) -> int:
        return self.features.n

    def _cols(self, cols: Sequence[int] | None):
        return slice(None) if cols is None else np.asarray(cols, dtype=int)

    def components(self, rows: Sequence[int], cols: Sequence[int] | None = None) -> Components:
        """Component similarities between ``rows`` and ``cols`` (default: every movie)."""
        f = self.features
        rows = np.asarray(rows, dtype=int)
        c = self._cols(cols)

        def product(matrix, transposed):
            if cols is None:
                block = matrix[rows] @ transposed
            else:
                block = matrix[rows] @ matrix[c].T
            return np.clip(block.toarray().astype(np.float64), 0.0, 1.0)

        plot_raw = product(f.plot, self._plot_t) if f.plot.shape[1] else np.zeros((len(rows), self._width(cols)))
        genre = product(f.genre, self._genre_t) if f.genre.shape[1] else np.zeros_like(plot_raw)
        director = product(f.director, self._dir_t) if f.director.shape[1] else np.zeros_like(plot_raw)

        def pair_mask(avail):
            return avail[rows][:, None] & (avail if cols is None else avail[c])[None, :]

        plot_ok, genre_ok, dir_ok = (pair_mask(f.plot_available), pair_mask(f.genre_available),
                                     pair_mask(f.director_available))
        plot = np.clip(plot_raw / f.plot_reference, 0.0, 1.0) if self.calibrate_plot else plot_raw
        return Components(
            plot_raw=np.where(plot_ok, plot_raw, 0.0), plot=np.where(plot_ok, plot, 0.0),
            genre=np.where(genre_ok, genre, 0.0), director=np.where(dir_ok, director, 0.0),
            plot_ok=plot_ok, genre_ok=genre_ok, director_ok=dir_ok,
        )

    def _width(self, cols: Sequence[int] | None) -> int:
        return self.n if cols is None else len(cols)

    def combine(self, comps: Components, rows: Sequence[int]) -> np.ndarray:
        """Weighted content score (see module docstring). Finite, bounded to [0, 1]."""
        f, w = self.features, self.weights
        rows = np.asarray(rows, dtype=int)
        w_pair = w.plot * comps.plot_ok + w.genre * comps.genre_ok + w.director * comps.director_ok
        w_seed = (w.plot * f.plot_available[rows] + w.genre * f.genre_available[rows]
                  + w.director * f.director_available[rows])[:, None]
        numerator = w.plot * comps.plot * comps.plot_ok + w.genre * comps.genre * comps.genre_ok \
            + w.director * comps.director * comps.director_ok
        with np.errstate(divide="ignore", invalid="ignore"):
            score = numerator / w_pair * np.power(w_pair / w_seed, self.gamma)
        score = np.where((w_pair > 0) & (w_seed > 0), score, 0.0)
        return np.clip(np.nan_to_num(score, nan=0.0, posinf=0.0, neginf=0.0), 0.0, 1.0)

    def similarity(self, rows: Sequence[int], cols: Sequence[int] | None = None) -> tuple[np.ndarray, Components]:
        """Content score matrix and its components for ``rows`` x ``cols``."""
        comps = self.components(rows, cols)
        return self.combine(comps, rows), comps

    def pairwise_among(self, indices: Sequence[int]) -> np.ndarray:
        """Symmetric content similarity among a small candidate pool (used by MMR)."""
        score, _ = self.similarity(indices, indices)
        return (score + score.T) / 2.0
