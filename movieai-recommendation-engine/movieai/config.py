"""Central, immutable configuration for the MOVIEAI engine.

Every tunable number (weights, TF-IDF parameters, personalization constants) lives
here and can be overridden through ``MOVIEAI_*`` environment variables (see
``.env.example``). No module should hardcode a weight.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass, field, replace
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "MOVIEAI_Movies_Enriched_For_Recommendation.csv"
ARTIFACT_SCHEMA_VERSION = 1  # bump when the on-disk artifact layout changes


@dataclass(frozen=True)
class SimilarityWeights:
    """Relative weights of the three core content signals (normalised on use)."""

    plot: float = 0.70
    genre: float = 0.25
    director: float = 0.05

    def validate(self) -> None:
        values = (self.plot, self.genre, self.director)
        if any(v < 0 for v in values) or sum(values) <= 0:
            raise ValueError("Similarity weights must be >= 0 and sum to more than 0.")

    def normalized(self) -> "SimilarityWeights":
        self.validate()
        total = self.plot + self.genre + self.director
        return SimilarityWeights(self.plot / total, self.genre / total, self.director / total)


@dataclass(frozen=True)
class TfidfConfig:
    ngram_range: tuple[int, int] = (1, 2)
    max_features: int = 50_000
    min_df: int = 2
    sublinear_tf: bool = True


@dataclass(frozen=True)
class RankingConfig:
    """Optional re-ranking signals. All default to 0 (= disabled).

    ``rank_score = (content + sum(w_i * signal_i)) / (1 + sum(w_i))`` so the result
    stays in [0, 1] and every boost is visible in ``Ranking_Components``.
    """

    quality_weight: float = 0.0       # Bayesian-averaged Vote_Average, 0-1
    popularity_weight: float = 0.0    # percentile rank of Popularity
    vote_count_weight: float = 0.0    # percentile rank of Vote_Count
    year_weight: float = 0.0          # closeness of release year to the seed
    language_weight: float = 0.0      # 1 if same Language as the seed
    runtime_weight: float = 0.0       # closeness of runtime to the seed
    year_scale: float = 15.0          # years at which year proximity decays to ~0.37
    runtime_scale: float = 30.0       # minutes at which runtime proximity decays to ~0.37
    bayes_min_votes: int = 500        # prior strength ("m") of the Bayesian average
    pool_multiplier: int = 5          # candidate pool = max(min_pool, limit * multiplier)
    min_pool: int = 50


@dataclass(frozen=True)
class PersonalizationConfig:
    """Constants that turn interactions into preference signals."""

    like_weight: float = 1.0
    favorite_weight: float = 1.5
    dislike_weight: float = -1.5
    rating_weight: float = 1.0          # multiplies the normalised rating in [-1, 1]
    watch_history_weight: float = 0.1   # exposure/interest only, NOT a "like"
    watchlist_weight: float = 0.2       # intent only, NOT a "like"
    weight_clip: float = 2.0            # |combined weight| per movie is capped here
    rating_min: float = 0.5
    rating_max: float = 5.0
    content_weight: float = 0.70        # seed-mode blend: content relevance ...
    preference_weight: float = 0.30     # ... and user-profile relevance
    negative_penalty: float = 0.5       # max share of a dislike's similarity subtracted
    max_share: float = 0.7              # pref = max_share*best_match + (1-max_share)*mean
    favorite_genre_weight: float = 0.15
    preferred_language_weight: float = 0.10
    discovery_novelty_weight: float = 0.5
    discovery_min_quality: float = 0.60  # Bayesian quality gate for discovery mode
    discovery_min_votes: int = 100


@dataclass(frozen=True)
class Settings:
    """Everything the engine needs. Build with :meth:`from_env` or construct directly."""

    data_path: Path = DEFAULT_DATA_PATH
    db_path: Path = PROJECT_ROOT / "data" / "movieai_interactions.db"
    artifacts_dir: Path = PROJECT_ROOT / "artifacts"
    reports_dir: Path = PROJECT_ROOT / "reports"
    weights: SimilarityWeights = field(default_factory=SimilarityWeights)
    tfidf: TfidfConfig = field(default_factory=TfidfConfig)
    ranking: RankingConfig = field(default_factory=RankingConfig)
    personalization: PersonalizationConfig = field(default_factory=PersonalizationConfig)
    calibrate_plot: bool = True            # rescale raw TF-IDF cosine by a corpus reference
    plot_reference_quantile: float = 0.95  # quantile of each movie's best (top-1) raw plot similarity
    genre_idf: bool = True                 # rarer genres count a little more
    partial_evidence_gamma: float = 1.0    # 1 = a signal missing on the candidate earns no credit; 0 = renormalise fully
    genre_fallback_primary: bool = True    # use Primary_Genre only if Genres is empty and Primary_Genre is real
    use_artifact_cache: bool = True
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    )
    log_level: str = "INFO"

    @classmethod
    def from_env(cls, **overrides) -> "Settings":
        """Create settings from ``MOVIEAI_*`` environment variables (see ``.env.example``)."""
        env = os.environ
        weights = SimilarityWeights(
            plot=float(env.get("MOVIEAI_WEIGHT_PLOT", SimilarityWeights.plot)),
            genre=float(env.get("MOVIEAI_WEIGHT_GENRE", SimilarityWeights.genre)),
            director=float(env.get("MOVIEAI_WEIGHT_DIRECTOR", SimilarityWeights.director)),
        )
        weights.validate()
        tfidf = TfidfConfig(
            max_features=int(env.get("MOVIEAI_TFIDF_MAX_FEATURES", TfidfConfig.max_features)),
            min_df=int(env.get("MOVIEAI_TFIDF_MIN_DF", TfidfConfig.min_df)),
        )
        origins = tuple(o.strip() for o in env.get("MOVIEAI_CORS_ORIGINS", ",".join(cls.cors_origins)).split(",") if o.strip())
        settings = cls(
            data_path=Path(env.get("MOVIEAI_DATA_PATH", DEFAULT_DATA_PATH)),
            db_path=Path(env.get("MOVIEAI_DB_PATH", PROJECT_ROOT / "data" / "movieai_interactions.db")),
            artifacts_dir=Path(env.get("MOVIEAI_ARTIFACTS_DIR", PROJECT_ROOT / "artifacts")),
            reports_dir=Path(env.get("MOVIEAI_REPORTS_DIR", PROJECT_ROOT / "reports")),
            weights=weights,
            tfidf=tfidf,
            calibrate_plot=env.get("MOVIEAI_CALIBRATE_PLOT", "1") not in {"0", "false", "False"},
            use_artifact_cache=env.get("MOVIEAI_USE_ARTIFACT_CACHE", "1") not in {"0", "false", "False"},
            cors_origins=origins,
            log_level=env.get("MOVIEAI_LOG_LEVEL", "INFO").upper(),
        )
        return replace(settings, **overrides) if overrides else settings

    def model_fingerprint(self) -> str:
        """Hash of every setting that changes the *fitted* artifacts (not request-time knobs)."""
        payload = {
            "schema": ARTIFACT_SCHEMA_VERSION,
            "tfidf": asdict(self.tfidf),
            "calibrate_plot": self.calibrate_plot,
            "plot_reference_quantile": self.plot_reference_quantile,
            "genre_idf": self.genre_idf,
            "genre_fallback_primary": self.genre_fallback_primary,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()[:16]
