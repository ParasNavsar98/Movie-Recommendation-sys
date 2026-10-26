"""Build (and persist) the content features for every movie.

Three independent, L2-normalised sparse matrices are produced so that cosine
similarity is a plain sparse dot product and nothing needs an ``n x n`` dense matrix:

* ``plot``     - TF-IDF (1-2 grams) over cleaned synopses
* ``genre``    - multi-label, optionally IDF-weighted, over the *complete* genre list
* ``director`` - one-hot over normalised director names

Rows lacking a signal are all-zero and flagged in the matching ``*_available`` mask.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import scipy.sparse as sp
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer, normalize

from .config import ARTIFACT_SCHEMA_VERSION, Settings
from .data_loader import MovieDataset

logger = logging.getLogger(__name__)
ARTIFACT_FILE = "features.joblib"
MANIFEST_FILE = "manifest.json"


@dataclass
class FeatureSet:
    """Fitted features and the objects needed to explain them."""

    plot: sp.csr_matrix
    plot_available: np.ndarray
    genre: sp.csr_matrix
    genre_available: np.ndarray
    genre_labels: list[str]
    director: sp.csr_matrix
    director_available: np.ndarray
    vectorizer: TfidfVectorizer | None
    plot_reference: float
    info: dict[str, Any] = field(default_factory=dict)

    @property
    def n(self) -> int:
        return self.plot.shape[0]


def _top1_reference(matrix: sp.csr_matrix, available: np.ndarray, quantile: float, chunk: int = 512) -> float:
    """Quantile of every movie's best raw plot similarity to any *other* movie."""
    n = matrix.shape[0]
    best = []
    transposed = matrix.T.tocsc()
    for start in range(0, n, chunk):
        block = (matrix[start:start + chunk] @ transposed).toarray()
        rows = np.arange(block.shape[0])
        block[rows, start + rows] = 0.0  # ignore self
        block[:, ~available] = 0.0
        best.append(block.max(axis=1)[available[start:start + chunk]])
    values = np.concatenate(best) if best else np.array([])
    values = values[values > 0]
    if values.size == 0:
        return 1.0
    return float(max(np.quantile(values, quantile), 1e-6))


def _build_plot(dataset: MovieDataset, settings: Settings):
    texts = dataset.df["Plot_Text"].where(dataset.df["Description_Clean"].notna(), "").astype(str).tolist()
    has_text = np.array([bool(t.strip()) for t in texts])
    n = len(texts)
    if not has_text.any():
        logger.warning("No usable descriptions; plot signal disabled.")
        return sp.csr_matrix((n, 0), dtype=np.float32), np.zeros(n, bool), None, 1.0
    cfg = settings.tfidf
    min_df = cfg.min_df
    while True:
        vec = TfidfVectorizer(
            ngram_range=cfg.ngram_range, max_features=cfg.max_features, min_df=min_df,
            sublinear_tf=cfg.sublinear_tf, lowercase=True, dtype=np.float32,
        )
        try:
            vec.fit([t for t, ok in zip(texts, has_text) if ok])
            break
        except ValueError:  # empty vocabulary (tiny fixtures with min_df > 1)
            if min_df <= 1:
                return sp.csr_matrix((n, 0), dtype=np.float32), np.zeros(n, bool), None, 1.0
            logger.warning("Empty vocabulary with min_df=%d; retrying with min_df=1.", min_df)
            min_df = 1
    matrix = normalize(vec.transform(texts)).tocsr().astype(np.float32)
    available = has_text & (matrix.getnnz(axis=1) > 0)
    reference = _top1_reference(matrix, available, settings.plot_reference_quantile) if settings.calibrate_plot else 1.0
    return matrix, available, vec, reference


def _build_genre(dataset: MovieDataset, settings: Settings):
    lists = dataset.df["Genre_List"].tolist()
    mlb = MultiLabelBinarizer(sparse_output=True)
    binary = mlb.fit_transform(lists).tocsr().astype(np.float32)
    available = binary.getnnz(axis=1) > 0
    if binary.shape[1] and settings.genre_idf:
        df_g = np.asarray(binary.sum(axis=0)).ravel()
        idf = np.log((1 + available.sum()) / (1 + df_g)) + 1.0
        binary = binary.multiply(idf.astype(np.float32)).tocsr()
    return normalize(binary).tocsr().astype(np.float32), available, [str(c) for c in mlb.classes_]


def _build_director(dataset: MovieDataset):
    mlb = MultiLabelBinarizer(sparse_output=True)
    binary = mlb.fit_transform(dataset.df["Director_Keys"].tolist()).tocsr().astype(np.float32)
    return normalize(binary).tocsr().astype(np.float32), binary.getnnz(axis=1) > 0


def build_features(dataset: MovieDataset, settings: Settings) -> FeatureSet:
    """Fit all feature extractors once. Deterministic for a given dataset + settings."""
    plot, plot_ok, vec, reference = _build_plot(dataset, settings)
    genre, genre_ok, labels = _build_genre(dataset, settings)
    director, director_ok = _build_director(dataset)
    info = {
        "plot_vocabulary_size": int(plot.shape[1]),
        "genre_count": len(labels),
        "director_count": int(director.shape[1]),
        "plot_reference": reference,
        "plot_available": int(plot_ok.sum()),
        "genre_available": int(genre_ok.sum()),
        "director_available": int(director_ok.sum()),
    }
    logger.info("Features built: %s", info)
    return FeatureSet(plot, plot_ok, genre, genre_ok, labels, director, director_ok, vec, reference, info)


# --------------------------------------------------------------------------- persistence
def _manifest(dataset: MovieDataset, settings: Settings) -> dict[str, Any]:
    return {
        "schema_version": ARTIFACT_SCHEMA_VERSION,
        "dataset_sha256": dataset.report.source_sha256,
        "dataset_records": dataset.report.records,
        "model_fingerprint": settings.model_fingerprint(),
        "sklearn_version": sklearn.__version__,
        "numpy_version": np.__version__,
    }


def save_artifacts(features: FeatureSet, dataset: MovieDataset, settings: Settings) -> Path:
    """Persist fitted features + a manifest to ``settings.artifacts_dir``."""
    out = Path(settings.artifacts_dir)
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(features, out / ARTIFACT_FILE, compress=3)
    manifest = _manifest(dataset, settings)
    manifest["info"] = features.info
    (out / MANIFEST_FILE).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    logger.info("Saved model artifacts to %s", out)
    return out


def load_artifacts(dataset: MovieDataset, settings: Settings) -> FeatureSet | None:
    """Return cached features if (and only if) the manifest matches; else ``None``.

    Dataset hash, model parameters and library versions must all match, so a changed CSV
    or changed TF-IDF setting automatically triggers a rebuild.
    """
    out = Path(settings.artifacts_dir)
    manifest_path, data_path = out / MANIFEST_FILE, out / ARTIFACT_FILE
    if not (manifest_path.exists() and data_path.exists()):
        return None
    try:
        stored = json.loads(manifest_path.read_text(encoding="utf-8"))
        expected = _manifest(dataset, settings)
        if any(stored.get(k) != v for k, v in expected.items()):
            logger.info("Artifact manifest mismatch; rebuilding.")
            return None
        features = joblib.load(data_path)
        return features if isinstance(features, FeatureSet) and features.n == len(dataset) else None
    except Exception as exc:  # corrupt/incompatible cache must never break startup
        logger.warning("Ignoring unreadable artifacts (%s); rebuilding.", exc)
        return None


def get_features(dataset: MovieDataset, settings: Settings, *, force_rebuild: bool = False) -> tuple[FeatureSet, str]:
    """Load cached features or build (and cache) them. Returns ``(features, source)``."""
    if settings.use_artifact_cache and not force_rebuild:
        cached = load_artifacts(dataset, settings)
        if cached is not None:
            return cached, "cache"
    features = build_features(dataset, settings)
    if settings.use_artifact_cache:
        try:
            save_artifacts(features, dataset, settings)
        except OSError as exc:
            logger.warning("Could not write artifacts: %s", exc)
    return features, "built"
