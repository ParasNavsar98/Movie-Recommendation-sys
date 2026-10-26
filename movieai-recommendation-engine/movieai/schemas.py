"""Pydantic v2 request/response schemas for the API.

Field names follow the dataset (``Movie_ID``, ``Release_Year`` ...) so the existing
React prototype can bind to them without renaming.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .personalization import UserProfile
from .recommender import MODES, Recommendation, RecommendationResult
from .search import SearchHit

MovieId = int


class MovieSummary(BaseModel):
    Movie_ID: int
    Title: str
    Release_Year: int | None = None
    Genres: str | None = None
    Poster_Web_Path: str | None = None
    poster_path: str | None = None


class SearchCandidate(MovieSummary):
    Match_Type: str

    @classmethod
    def from_hit(cls, hit: SearchHit) -> "SearchCandidate":
        return cls(**hit.to_dict())


class SearchResponse(BaseModel):
    query: str
    auto_resolved: bool = Field(description="True only when exactly one exact-title record exists.")
    resolved_movie_id: int | None = None
    results: list[SearchCandidate]


class MovieDetail(MovieSummary):
    Language: str | None = None
    Director: str | None = None
    Vote_Average: float | None = None
    Vote_Count: int | None = None
    Popularity: float | None = None
    Runtime_Min: float | None = None
    Movie_Description: str | None = None


class RecommendedMovie(BaseModel):
    Movie_ID: int
    Title: str
    Release_Year: int | None = None
    Genres: str | None = None
    Director: str | None = None
    Vote_Average: float | None = None
    Poster_Web_Path: str | None = None
    poster_path: str | None = None
    Similarity_Score: float = Field(ge=0.0, le=1.0)
    Score_Components: dict[str, float]
    Ranking_Components: dict[str, float] = Field(default_factory=dict)
    Recommendation_Reasons: list[str]

    @classmethod
    def from_rec(cls, rec: Recommendation) -> "RecommendedMovie":
        r = rec.record
        return cls(
            Movie_ID=rec.movie_id, Title=r["Title"], Release_Year=r["Release_Year"], Genres=r["Genres"],
            Director=r["Director"], Vote_Average=r["Vote_Average"], Poster_Web_Path=r["Poster_Web_Path"],
            poster_path=r["poster_path"], Similarity_Score=min(max(rec.score, 0.0), 1.0),
            Score_Components={k: round(v, 6) for k, v in rec.components.items()},
            Ranking_Components={k: round(v, 6) for k, v in rec.ranking_components.items()},
            Recommendation_Reasons=rec.reasons,
        )


class RecommendationResponse(BaseModel):
    mode: str
    seed_movie_id: int | None = None
    count: int
    fallback_reason: str | None = None
    warnings: list[str] = Field(default_factory=list)
    excluded_count: int = 0
    results: list[RecommendedMovie]

    @classmethod
    def from_result(cls, result: RecommendationResult) -> "RecommendationResponse":
        items = [RecommendedMovie.from_rec(r) for r in result.items]
        return cls(mode=result.mode, seed_movie_id=result.seed_movie_id, count=len(items),
                   fallback_reason=result.fallback_reason, warnings=result.warnings,
                   excluded_count=result.excluded_count, results=items)


class UserProfileIn(BaseModel):
    """User preference profile supplied by the client (no database in this version)."""

    model_config = ConfigDict(extra="forbid")
    likes: list[MovieId] = Field(default_factory=list, max_length=2000)
    dislikes: list[MovieId] = Field(default_factory=list, max_length=2000)
    favorites: list[MovieId] = Field(default_factory=list, max_length=2000)
    watchlist: list[MovieId] = Field(default_factory=list, max_length=2000)
    watch_history: list[MovieId] = Field(default_factory=list, max_length=5000)
    ratings: dict[MovieId, float] = Field(default_factory=dict, description="Movie_ID -> rating (0.5-5 by default).")
    favorite_genres: list[str] = Field(default_factory=list, max_length=30)
    preferred_languages: list[str] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def _no_contradictions(self) -> "UserProfileIn":
        conflict = (set(self.likes) | set(self.favorites)) & set(self.dislikes)
        if conflict:
            raise ValueError(f"Movies cannot be both liked/favorited and disliked: {sorted(conflict)}")
        return self

    def to_profile(self) -> UserProfile:
        return UserProfile(**self.model_dump())


class PersonalizedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: UserProfileIn = Field(default_factory=UserProfileIn)
    mode: Literal["profile", "seed", "multi_seed", "discovery"] = "profile"
    seed_movie_id: int | None = None
    seed_movie_ids: list[MovieId] = Field(default_factory=list, max_length=50)
    limit: int = Field(10, ge=1, le=100)
    exclude_watched: bool = True
    exclude_watchlist: bool = False
    exclude_disliked: bool = True
    override_exclusions: list[MovieId] = Field(default_factory=list)
    language: str | None = Field(None, max_length=40)
    diversity_lambda: float = Field(1.0, ge=0.0, le=1.0, description="1 = relevance only; lower = more diverse (MMR).")

    @field_validator("mode")
    @classmethod
    def _known_mode(cls, v: str) -> str:
        if v not in MODES:
            raise ValueError(f"mode must be one of {MODES}")
        return v


class HealthResponse(BaseModel):
    status: str
    ready: bool
    movies: int = 0
    feature_source: str | None = None
    plot_vocabulary_size: int | None = None
    weights: dict[str, float] = Field(default_factory=dict)
    dataset_sha256: str | None = None
    missing_descriptions: int = 0
    missing_genres: int = 0


class InteractionRequest(BaseModel):
    movie_id: int


class RatingRequest(BaseModel):
    movie_id: int
    rating: float = Field(ge=0.0, le=5.0)


class InteractionResponse(BaseModel):
    status: str
    movie_id: int
    interaction_type: str
    active: bool
    message: str | None = None


class UserProfileStateResponse(BaseModel):
    user_id: str
    name: str = ""
    email: str = ""
    likes: list[int] = Field(default_factory=list)
    dislikes: list[int] = Field(default_factory=list)
    favorites: list[int] = Field(default_factory=list)
    watchlist: list[int] = Field(default_factory=list)
    watched: list[int] = Field(default_factory=list)
    history: list[int] = Field(default_factory=list)
    ratings: dict[int, float] = Field(default_factory=dict)
    favorite_genres: list[str] = Field(default_factory=list)
    preferred_languages: list[str] = Field(default_factory=list)


class UserProfileUpdateRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    favorite_genres: list[str] | None = None
    preferred_languages: list[str] | None = None


class ResetResponse(BaseModel):
    status: str
    user_id: str
    message: str


class ErrorResponse(BaseModel):
    detail: str
