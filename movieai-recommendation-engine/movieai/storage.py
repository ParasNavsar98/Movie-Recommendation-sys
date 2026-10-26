"""SQLite persistence for user profiles, interaction signals, and ratings.

Separates user interaction state from the canonical movie dataset.
Ensures thread safety and atomic transactions.
"""
from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

from .personalization import UserProfile

logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class InteractionStorage:
    """Manages user state and interactions in SQLite."""

    def __init__(self, db_path: Path | str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _connection(self) -> Generator[sqlite3.Connection, None, None]:
        conn = sqlite3.connect(
            str(self.db_path),
            timeout=10.0,
            check_same_thread=False,
            isolation_level="DEFERRED",
        )
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA foreign_keys = ON;")
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL DEFAULT '',
                    email TEXT NOT NULL DEFAULT '',
                    favorite_genres TEXT NOT NULL DEFAULT '[]',
                    preferred_languages TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS movie_interactions (
                    user_id TEXT NOT NULL,
                    movie_id INTEGER NOT NULL,
                    interaction_type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, movie_id, interaction_type)
                );

                CREATE TABLE IF NOT EXISTS movie_ratings (
                    user_id TEXT NOT NULL,
                    movie_id INTEGER NOT NULL,
                    rating REAL NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, movie_id)
                );

                CREATE INDEX IF NOT EXISTS idx_interactions_user_type
                    ON movie_interactions (user_id, interaction_type);
                CREATE INDEX IF NOT EXISTS idx_ratings_user
                    ON movie_ratings (user_id);
                """
            )

    def ensure_user(self, user_id: str, name: str = "", email: str = "") -> dict[str, Any]:
        """Ensure a user record exists, creating one if missing."""
        clean_user = user_id.strip() or "default-user"
        now = _utc_now_iso()
        with self._connection() as conn:
            row = conn.execute(
                "SELECT user_id, name, email, favorite_genres, preferred_languages FROM user_profiles WHERE user_id = ?",
                (clean_user,),
            ).fetchone()
            if row is None:
                conn.execute(
                    """
                    INSERT INTO user_profiles (user_id, name, email, favorite_genres, preferred_languages, created_at, updated_at)
                    VALUES (?, ?, ?, '[]', '[]', ?, ?)
                    """,
                    (clean_user, name.strip(), email.strip(), now, now),
                )
                return {
                    "user_id": clean_user,
                    "name": name.strip(),
                    "email": email.strip(),
                    "favorite_genres": [],
                    "preferred_languages": [],
                }
            return {
                "user_id": row["user_id"],
                "name": row["name"],
                "email": row["email"],
                "favorite_genres": json.loads(row["favorite_genres"]),
                "preferred_languages": json.loads(row["preferred_languages"]),
            }

    def update_profile(
        self,
        user_id: str,
        *,
        name: str | None = None,
        email: str | None = None,
        favorite_genres: list[str] | None = None,
        preferred_languages: list[str] | None = None,
    ) -> dict[str, Any]:
        self.ensure_user(user_id)
        now = _utc_now_iso()
        with self._connection() as conn:
            if name is not None:
                conn.execute(
                    "UPDATE user_profiles SET name = ?, updated_at = ? WHERE user_id = ?",
                    (name.strip(), now, user_id),
                )
            if email is not None:
                conn.execute(
                    "UPDATE user_profiles SET email = ?, updated_at = ? WHERE user_id = ?",
                    (email.strip(), now, user_id),
                )
            if favorite_genres is not None:
                clean_genres = [g.strip() for g in favorite_genres if g.strip()]
                conn.execute(
                    "UPDATE user_profiles SET favorite_genres = ?, updated_at = ? WHERE user_id = ?",
                    (json.dumps(clean_genres), now, user_id),
                )
            if preferred_languages is not None:
                clean_langs = [l.strip() for l in preferred_languages if l.strip()]
                conn.execute(
                    "UPDATE user_profiles SET preferred_languages = ?, updated_at = ? WHERE user_id = ?",
                    (json.dumps(clean_langs), now, user_id),
                )
        return self.get_user_state(user_id)

    def toggle_interaction(self, user_id: str, movie_id: int, interaction_type: str) -> bool:
        """Toggle an interaction (like, dislike, favorite, watchlist, watched).

        Enforces policy:
        - like & dislike are mutually exclusive.
        - favorite requires not disliked (adds like if needed).
        - dislike removes likes, favorites, and ratings >= 3.
        """
        self.ensure_user(user_id)
        now = _utc_now_iso()
        itype = interaction_type.strip().lower()
        if itype not in {"like", "dislike", "favorite", "watchlist", "watched", "history"}:
            raise ValueError(f"Unknown interaction type: {interaction_type}")

        with self._connection() as conn:
            existing = conn.execute(
                "SELECT 1 FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = ?",
                (user_id, movie_id, itype),
            ).fetchone()

            if existing:
                # Remove it
                conn.execute(
                    "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = ?",
                    (user_id, movie_id, itype),
                )
                active = False
            else:
                # Adding the interaction
                if itype == "like":
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = 'dislike'",
                        (user_id, movie_id),
                    )
                elif itype == "dislike":
                    conn.execute(
                        """
                        DELETE FROM movie_interactions
                        WHERE user_id = ? AND movie_id = ? AND interaction_type IN ('like', 'favorite')
                        """,
                        (user_id, movie_id),
                    )
                    conn.execute(
                        "DELETE FROM movie_ratings WHERE user_id = ? AND movie_id = ? AND rating >= 3.0",
                        (user_id, movie_id),
                    )
                elif itype == "favorite":
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = 'dislike'",
                        (user_id, movie_id),
                    )

                conn.execute(
                    """
                    INSERT OR REPLACE INTO movie_interactions (user_id, movie_id, interaction_type, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, movie_id, itype, now),
                )
                active = True

        return active

    def set_interaction(self, user_id: str, movie_id: int, interaction_type: str, active: bool) -> None:
        """Explicitly set an interaction state to active (True) or inactive (False)."""
        self.ensure_user(user_id)
        now = _utc_now_iso()
        itype = interaction_type.strip().lower()
        with self._connection() as conn:
            if not active:
                conn.execute(
                    "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = ?",
                    (user_id, movie_id, itype),
                )
            else:
                if itype == "like":
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = 'dislike'",
                        (user_id, movie_id),
                    )
                elif itype == "dislike":
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type IN ('like', 'favorite')",
                        (user_id, movie_id),
                    )
                    conn.execute(
                        "DELETE FROM movie_ratings WHERE user_id = ? AND movie_id = ? AND rating >= 3.0",
                        (user_id, movie_id),
                    )
                elif itype == "favorite":
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = 'dislike'",
                        (user_id, movie_id),
                    )
                conn.execute(
                    """
                    INSERT OR REPLACE INTO movie_interactions (user_id, movie_id, interaction_type, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, movie_id, itype, now),
                )

    def record_rating(self, user_id: str, movie_id: int, rating: float) -> None:
        """Record or remove a user rating."""
        self.ensure_user(user_id)
        now = _utc_now_iso()
        with self._connection() as conn:
            if rating <= 0:
                conn.execute(
                    "DELETE FROM movie_ratings WHERE user_id = ? AND movie_id = ?",
                    (user_id, movie_id),
                )
            else:
                if rating >= 3.0:
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = 'dislike'",
                        (user_id, movie_id),
                    )
                elif rating < 2.5:
                    conn.execute(
                        "DELETE FROM movie_interactions WHERE user_id = ? AND movie_id = ? AND interaction_type = 'favorite'",
                        (user_id, movie_id),
                    )
                conn.execute(
                    """
                    INSERT OR REPLACE INTO movie_ratings (user_id, movie_id, rating, updated_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, movie_id, float(rating), now),
                )

    def record_watched(self, user_id: str, movie_id: int) -> None:
        """Record that a movie has been watched (adds to 'watched' and 'history')."""
        self.set_interaction(user_id, movie_id, "watched", True)
        self.set_interaction(user_id, movie_id, "history", True)

    def get_user_state(self, user_id: str) -> dict[str, Any]:
        """Return the complete interaction state for a user."""
        user_info = self.ensure_user(user_id)
        with self._connection() as conn:
            interactions = conn.execute(
                """
                SELECT movie_id, interaction_type
                FROM movie_interactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()

            ratings_rows = conn.execute(
                "SELECT movie_id, rating FROM movie_ratings WHERE user_id = ?",
                (user_id,),
            ).fetchall()

        likes: list[int] = []
        dislikes: list[int] = []
        favorites: list[int] = []
        watchlist: list[int] = []
        watched: list[int] = []
        history: list[int] = []

        for row in interactions:
            mid = int(row["movie_id"])
            t = row["interaction_type"]
            if t == "like" and mid not in likes:
                likes.append(mid)
            elif t == "dislike" and mid not in dislikes:
                dislikes.append(mid)
            elif t == "favorite" and mid not in favorites:
                favorites.append(mid)
            elif t == "watchlist" and mid not in watchlist:
                watchlist.append(mid)
            elif t == "watched" and mid not in watched:
                watched.append(mid)
            elif t == "history" and mid not in history:
                history.append(mid)

        ratings = {int(r["movie_id"]): float(r["rating"]) for r in ratings_rows}

        return {
            "user_id": user_id,
            "name": user_info["name"],
            "email": user_info["email"],
            "likes": likes,
            "dislikes": dislikes,
            "favorites": favorites,
            "watchlist": watchlist,
            "watched": watched,
            "history": history,
            "ratings": ratings,
            "favorite_genres": user_info["favorite_genres"],
            "preferred_languages": user_info["preferred_languages"],
        }

    def get_user_profile(self, user_id: str) -> UserProfile:
        """Return a domain UserProfile instance for the recommendation algorithm."""
        state = self.get_user_state(user_id)
        # Ensure watch_history includes watched movies
        watch_hist = list(dict.fromkeys(state["history"] + state["watched"]))
        return UserProfile(
            likes=state["likes"],
            dislikes=state["dislikes"],
            favorites=state["favorites"],
            watchlist=state["watchlist"],
            watch_history=watch_hist,
            ratings=state["ratings"],
            favorite_genres=state["favorite_genres"],
            preferred_languages=state["preferred_languages"],
        )

    def reset_user(self, user_id: str) -> None:
        """Reset only the specified user's interactions and preferences without touching movies."""
        with self._connection() as conn:
            conn.execute("DELETE FROM movie_interactions WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM movie_ratings WHERE user_id = ?", (user_id,))
            now = _utc_now_iso()
            conn.execute(
                "UPDATE user_profiles SET favorite_genres = '[]', preferred_languages = '[]', updated_at = ? WHERE user_id = ?",
                (now, user_id),
            )
