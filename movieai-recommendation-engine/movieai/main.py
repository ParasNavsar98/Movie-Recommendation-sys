"""FastAPI application exposing search, recommendation, interaction, and profile endpoints.

Run:  ``uvicorn movieai.main:app --reload``  (from the project root).

The engine and interaction storage are built in the lifespan handler and stored on
``app.state`` (no module level globals). Use :func:`create_app` in tests to inject components.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .recommender import RecommendationError, Recommender
from .schemas import (
    HealthResponse,
    InteractionRequest,
    InteractionResponse,
    MovieDetail,
    PersonalizedRequest,
    RatingRequest,
    RecommendationResponse,
    ResetResponse,
    SearchCandidate,
    SearchResponse,
    UserProfileStateResponse,
    UserProfileUpdateRequest,
)
from .storage import InteractionStorage

logger = logging.getLogger("movieai.api")


def create_app(
    settings: Settings | None = None,
    recommender: Recommender | None = None,
    storage: InteractionStorage | None = None,
) -> FastAPI:
    """Application factory. Components may be injected (tests); otherwise built at startup."""
    settings = settings or Settings.from_env()
    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.recommender = recommender
        app.state.storage = storage or InteractionStorage(settings.db_path)
        app.state.startup_error = None
        if app.state.recommender is None:
            try:
                app.state.recommender = Recommender.from_settings(settings)
            except Exception as exc:  # keep /health available and report the cause
                logger.exception("Engine failed to start")
                app.state.startup_error = str(exc)
        yield

    app = FastAPI(title="MOVIEAI Recommendation API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PUT"],
        allow_headers=["Content-Type", "X-User-Id", "Authorization", "Accept"],
    )

    def engine(request: Request) -> Recommender:
        rec: Recommender | None = request.app.state.recommender
        if rec is None:
            raise HTTPException(status_code=503, detail="Recommendation engine is not ready.")
        return rec

    def db(request: Request) -> InteractionStorage:
        st: InteractionStorage | None = getattr(request.app.state, "storage", None)
        if st is None:
            raise HTTPException(status_code=503, detail="Interaction storage is not ready.")
        return st

    def user_id_from_request(request: Request) -> str:
        uid = request.headers.get("X-User-Id") or request.query_params.get("user_id") or "default-user"
        return uid.strip() or "default-user"

    def validate_movie_exists(rec: Recommender, movie_id: int) -> None:
        idx = rec.dataset.index_of(movie_id)
        if idx is None:
            raise HTTPException(status_code=404, detail=f"Unknown Movie_ID: {movie_id}")

    # -------------------------------------------------------------
    # System & Search Endpoints
    # -------------------------------------------------------------
    @app.get("/health", response_model=HealthResponse)
    def health(request: Request) -> HealthResponse:
        rec: Recommender | None = request.app.state.recommender
        if rec is None:
            return HealthResponse(status="unavailable", ready=False)
        info = rec.health()
        return HealthResponse(
            ready=True,
            missing_descriptions=rec.dataset.report.missing_descriptions,
            missing_genres=rec.dataset.report.missing_genres,
            **info,
        )

    @app.get("/movies/search", response_model=SearchResponse)
    def search(
        request: Request,
        q: Annotated[str, Query(min_length=1, max_length=200)],
        limit: Annotated[int, Query(ge=1, le=50)] = 10,
    ) -> SearchResponse:
        rec = engine(request)
        if not q.strip():
            raise HTTPException(status_code=422, detail="Query must not be blank.")
        resolution = rec.searcher.resolve(q)
        hits = rec.searcher.search(q, limit=limit)
        return SearchResponse(
            query=q,
            auto_resolved=resolution.status == "resolved",
            resolved_movie_id=resolution.movie_id,
            results=[SearchCandidate.from_hit(h) for h in hits],
        )

    @app.get("/movies/{movie_id}", response_model=MovieDetail)
    def movie(request: Request, movie_id: int) -> MovieDetail:
        rec = engine(request)
        idx = rec.dataset.index_of(movie_id)
        if idx is None:
            raise HTTPException(status_code=404, detail=f"Unknown Movie_ID: {movie_id}")
        return MovieDetail(**rec.dataset.record(idx))

    # -------------------------------------------------------------
    # User Profile & Persistent Interactions
    # -------------------------------------------------------------
    @app.get("/profile", response_model=UserProfileStateResponse)
    def get_profile(request: Request) -> UserProfileStateResponse:
        uid = user_id_from_request(request)
        store = db(request)
        state = store.get_user_state(uid)
        return UserProfileStateResponse(**state)

    @app.post("/profile", response_model=UserProfileStateResponse)
    def update_profile(request: Request, body: UserProfileUpdateRequest) -> UserProfileStateResponse:
        uid = user_id_from_request(request)
        store = db(request)
        state = store.update_profile(
            uid,
            name=body.name,
            email=body.email,
            favorite_genres=body.favorite_genres,
            preferred_languages=body.preferred_languages,
        )
        return UserProfileStateResponse(**state)

    @app.post("/profile/reset", response_model=ResetResponse)
    def reset_profile(request: Request) -> ResetResponse:
        uid = user_id_from_request(request)
        store = db(request)
        store.reset_user(uid)
        logger.info("Reset user profile: %s", uid)
        return ResetResponse(status="ok", user_id=uid, message="User profile and interactions successfully reset.")

    @app.post("/interactions/like", response_model=InteractionResponse)
    def toggle_like(request: Request, body: InteractionRequest) -> InteractionResponse:
        rec = engine(request)
        validate_movie_exists(rec, body.movie_id)
        uid = user_id_from_request(request)
        store = db(request)
        active = store.toggle_interaction(uid, body.movie_id, "like")
        action = "liked" if active else "unliked"
        return InteractionResponse(
            status="ok",
            movie_id=body.movie_id,
            interaction_type="like",
            active=active,
            message=f"Movie {body.movie_id} {action}.",
        )

    @app.post("/interactions/dislike", response_model=InteractionResponse)
    def toggle_dislike(request: Request, body: InteractionRequest) -> InteractionResponse:
        rec = engine(request)
        validate_movie_exists(rec, body.movie_id)
        uid = user_id_from_request(request)
        store = db(request)
        active = store.toggle_interaction(uid, body.movie_id, "dislike")
        action = "disliked" if active else "undisliked"
        return InteractionResponse(
            status="ok",
            movie_id=body.movie_id,
            interaction_type="dislike",
            active=active,
            message=f"Movie {body.movie_id} {action}.",
        )

    @app.post("/interactions/favorite", response_model=InteractionResponse)
    def toggle_favorite(request: Request, body: InteractionRequest) -> InteractionResponse:
        rec = engine(request)
        validate_movie_exists(rec, body.movie_id)
        uid = user_id_from_request(request)
        store = db(request)
        active = store.toggle_interaction(uid, body.movie_id, "favorite")
        action = "added to favorites" if active else "removed from favorites"
        return InteractionResponse(
            status="ok",
            movie_id=body.movie_id,
            interaction_type="favorite",
            active=active,
            message=f"Movie {body.movie_id} {action}.",
        )

    @app.post("/interactions/watchlist", response_model=InteractionResponse)
    def toggle_watchlist(request: Request, body: InteractionRequest) -> InteractionResponse:
        rec = engine(request)
        validate_movie_exists(rec, body.movie_id)
        uid = user_id_from_request(request)
        store = db(request)
        active = store.toggle_interaction(uid, body.movie_id, "watchlist")
        action = "added to watchlist" if active else "removed from watchlist"
        return InteractionResponse(
            status="ok",
            movie_id=body.movie_id,
            interaction_type="watchlist",
            active=active,
            message=f"Movie {body.movie_id} {action}.",
        )

    @app.post("/interactions/watched", response_model=InteractionResponse)
    def record_watched(request: Request, body: InteractionRequest) -> InteractionResponse:
        rec = engine(request)
        validate_movie_exists(rec, body.movie_id)
        uid = user_id_from_request(request)
        store = db(request)
        store.record_watched(uid, body.movie_id)
        return InteractionResponse(
            status="ok",
            movie_id=body.movie_id,
            interaction_type="watched",
            active=True,
            message=f"Movie {body.movie_id} recorded as watched.",
        )

    @app.post("/interactions/rate", response_model=InteractionResponse)
    def rate_movie(request: Request, body: RatingRequest) -> InteractionResponse:
        rec = engine(request)
        validate_movie_exists(rec, body.movie_id)
        uid = user_id_from_request(request)
        store = db(request)
        store.record_rating(uid, body.movie_id, body.rating)
        action = f"rated {body.rating} stars" if body.rating > 0 else "rating cleared"
        return InteractionResponse(
            status="ok",
            movie_id=body.movie_id,
            interaction_type="rating",
            active=body.rating > 0,
            message=f"Movie {body.movie_id} {action}.",
        )

    # -------------------------------------------------------------
    # Recommendations Endpoints
    # -------------------------------------------------------------
    @app.get("/recommendations/feed", response_model=RecommendationResponse)
    @app.get("/recommendations/initial", response_model=RecommendationResponse)
    def get_feed(
        request: Request,
        limit: Annotated[int, Query(ge=1, le=100)] = 12,
        mode: Annotated[str, Query(description="profile, discovery, or seed")] = "profile",
        genre: Annotated[str | None, Query(max_length=50)] = None,
        diversity_lambda: Annotated[float, Query(ge=0.0, le=1.0)] = 1.0,
        exclude_watched: bool = True,
        exclude_watchlist: bool = False,
        exclude_disliked: bool = True,
        language: Annotated[str | None, Query(max_length=40)] = None,
    ) -> RecommendationResponse:
        rec = engine(request)
        store = db(request)
        uid = user_id_from_request(request)

        # Retrieve profile for user from SQLite
        profile = store.get_user_profile(uid)

        # If genre is explicitly passed (e.g. from UI genre chip or cold-start), prioritize it
        if genre and genre.strip() and genre.strip().lower() != "all movies":
            clean_g = genre.strip()
            profile.favorite_genres = [clean_g] + [g for g in profile.favorite_genres if g != clean_g]

        try:
            result = rec.personalized(
                profile,
                mode=mode,
                limit=limit,
                exclude_watched=exclude_watched,
                exclude_watchlist=exclude_watchlist,
                exclude_disliked=exclude_disliked,
                language=language,
                diversity_lambda=diversity_lambda,
            )
        except RecommendationError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        logger.info(
            "Feed returned for user=%s mode=%s count=%d (fallback=%s)",
            uid,
            result.mode,
            len(result.items),
            result.fallback_reason,
        )
        return RecommendationResponse.from_result(result)

    @app.get("/recommendations/movie/{movie_id}", response_model=RecommendationResponse)
    def similar(
        request: Request,
        movie_id: int,
        limit: Annotated[int, Query(ge=1, le=100)] = 10,
        exclude_seen: bool = False,
        seen: Annotated[list[int] | None, Query(description="Movie_IDs already seen (used when exclude_seen=true).")] = None,
        diversity_lambda: Annotated[float, Query(ge=0.0, le=1.0, description="1 = no diversity; lower = more diverse.")] = 1.0,
        language: Annotated[str | None, Query(max_length=40)] = None,
    ) -> RecommendationResponse:
        rec = engine(request)
        try:
            result = rec.similar_to(
                movie_id,
                limit,
                exclude_ids=(seen or []) if exclude_seen else (),
                language=language,
                diversity_lambda=diversity_lambda,
            )
        except RecommendationError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if exclude_seen and not seen:
            result.warnings.append("exclude_seen=true but no 'seen' Movie_IDs were supplied; nothing was excluded.")
        logger.info("similar movie_id=%s returned=%d", movie_id, len(result.items))
        return RecommendationResponse.from_result(result)

    @app.post("/recommendations/personalized", response_model=RecommendationResponse)
    def personalized(request: Request, body: PersonalizedRequest) -> RecommendationResponse:
        rec = engine(request)
        try:
            result = rec.personalized(
                body.profile.to_profile(),
                mode=body.mode,
                seed_movie_id=body.seed_movie_id,
                seed_movie_ids=body.seed_movie_ids,
                limit=body.limit,
                exclude_watched=body.exclude_watched,
                exclude_watchlist=body.exclude_watchlist,
                exclude_disliked=body.exclude_disliked,
                override_exclusions=body.override_exclusions,
                language=body.language,
                diversity_lambda=body.diversity_lambda,
            )
        except RecommendationError as exc:
            status = 404 if "Unknown Movie_ID" in str(exc) else 422
            raise HTTPException(status_code=status, detail=str(exc)) from exc
        logger.info("personalized mode=%s returned=%d", result.mode, len(result.items))
        return RecommendationResponse.from_result(result)

    return app


def _default_app() -> FastAPI:
    return create_app()


app = _default_app()
