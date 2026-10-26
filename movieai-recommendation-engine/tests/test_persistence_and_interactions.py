"""Tests for SQLite persistence, user profile isolation, and interaction endpoints."""
from __future__ import annotations

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from movieai.main import create_app
from movieai.storage import InteractionStorage


@pytest.fixture
def storage(tmp_path: Path) -> InteractionStorage:
    return InteractionStorage(tmp_path / "test_interactions.db")


@pytest.fixture
def test_client(settings, recommender, storage):
    app = create_app(settings, recommender, storage=storage)
    with TestClient(app) as client:
        yield client


def test_storage_user_lifecycle(storage: InteractionStorage):
    u = storage.ensure_user("alice", name="Alice", email="alice@example.com")
    assert u["user_id"] == "alice"
    assert u["name"] == "Alice"
    assert u["email"] == "alice@example.com"

    # Profile update
    updated = storage.update_profile(
        "alice",
        favorite_genres=["Science Fiction", "Adventure"],
        preferred_languages=["English"],
    )
    assert updated["favorite_genres"] == ["Science Fiction", "Adventure"]
    assert updated["preferred_languages"] == ["English"]


def test_storage_mutual_exclusion(storage: InteractionStorage):
    user = "bob"
    # Like movie 1
    active = storage.toggle_interaction(user, 1, "like")
    assert active is True
    assert 1 in storage.get_user_state(user)["likes"]

    # Now dislike movie 1 -> should remove from likes
    active = storage.toggle_interaction(user, 1, "dislike")
    assert active is True
    state = storage.get_user_state(user)
    assert 1 not in state["likes"]
    assert 1 in state["dislikes"]

    # Now like movie 1 again -> should remove from dislikes
    active = storage.toggle_interaction(user, 1, "like")
    assert active is True
    state = storage.get_user_state(user)
    assert 1 in state["likes"]
    assert 1 not in state["dislikes"]


def test_storage_ratings_policy(storage: InteractionStorage):
    user = "carol"
    # Rate 5 stars
    storage.record_rating(user, 1, 5.0)
    assert storage.get_user_state(user)["ratings"][1] == 5.0

    # Rate 0 clears rating
    storage.record_rating(user, 1, 0)
    assert 1 not in storage.get_user_state(user)["ratings"]


def test_storage_profile_isolation(storage: InteractionStorage):
    storage.toggle_interaction("user_a", 1, "like")
    storage.toggle_interaction("user_b", 2, "like")

    state_a = storage.get_user_state("user_a")
    state_b = storage.get_user_state("user_b")

    assert state_a["likes"] == [1]
    assert 2 not in state_a["likes"]

    assert state_b["likes"] == [2]
    assert 1 not in state_b["likes"]


def test_storage_reset_user(storage: InteractionStorage):
    user = "dan"
    storage.toggle_interaction(user, 1, "like")
    storage.toggle_interaction(user, 2, "favorite")
    storage.record_rating(user, 3, 4.0)
    storage.update_profile(user, favorite_genres=["Horror"])

    assert len(storage.get_user_state(user)["likes"]) == 1
    storage.reset_user(user)

    clean = storage.get_user_state(user)
    assert clean["likes"] == []
    assert clean["favorites"] == []
    assert clean["ratings"] == {}
    assert clean["favorite_genres"] == []


def test_api_interaction_endpoints(test_client):
    headers = {"X-User-Id": "test_user"}

    # Like movie 1
    res = test_client.post("/interactions/like", json={"movie_id": 1}, headers=headers)
    assert res.status_code == 200
    assert res.json()["active"] is True

    # Check profile
    prof = test_client.get("/profile", headers=headers).json()
    assert 1 in prof["likes"]

    # Toggle favorite
    fav = test_client.post("/interactions/favorite", json={"movie_id": 1}, headers=headers)
    assert fav.status_code == 200
    assert fav.json()["active"] is True

    # Toggle watchlist
    wl = test_client.post("/interactions/watchlist", json={"movie_id": 2}, headers=headers)
    assert wl.status_code == 200
    assert wl.json()["active"] is True

    # Record watched
    w = test_client.post("/interactions/watched", json={"movie_id": 3}, headers=headers)
    assert w.status_code == 200
    assert w.json()["active"] is True

    # Rate movie
    rate = test_client.post("/interactions/rate", json={"movie_id": 1, "rating": 4.5}, headers=headers)
    assert rate.status_code == 200

    # 404 on unknown movie
    err = test_client.post("/interactions/like", json={"movie_id": 999999}, headers=headers)
    assert err.status_code == 404


def test_api_feed_responds_to_interactions(test_client):
    headers = {"X-User-Id": "recommender_tester"}

    # Cold start feed returns recommendations
    initial_res = test_client.get("/recommendations/feed", headers=headers)
    assert initial_res.status_code == 200
    initial_data = initial_res.json()
    assert initial_data["count"] > 0

    # Like Space Quest (Movie 1, Science Fiction)
    test_client.post("/interactions/like", json={"movie_id": 1}, headers=headers)

    # Next feed call should prioritize Space Quest 2 (Movie 2)
    updated_res = test_client.get("/recommendations/feed", headers=headers)
    assert updated_res.status_code == 200
    results = updated_res.json()["results"]
    ids = [r["Movie_ID"] for r in results]
    assert 2 in ids  # Space Quest 2 is highly recommended because of Space Quest 1

    # Reset profile
    reset_res = test_client.post("/profile/reset", headers=headers)
    assert reset_res.status_code == 200
    prof = test_client.get("/profile", headers=headers).json()
    assert prof["likes"] == []
