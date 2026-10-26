import dataclasses

import pytest
from fastapi.testclient import TestClient

from movieai.evaluation import ndcg_at_k, precision_at_k, recall_at_k, reciprocal_rank
from movieai.feature_builder import get_features
from movieai.main import create_app


@pytest.fixture(scope="module")
def client(settings, recommender):
    with TestClient(create_app(settings, recommender)) as c:
        yield c


def test_health(client):
    body = client.get("/health").json()
    assert body["ready"] is True and body["movies"] == 12 and body["missing_descriptions"] == 1


def test_health_when_engine_unavailable(settings):
    bad = dataclasses.replace(settings, data_path=settings.data_path.with_name("missing.csv"))
    with TestClient(create_app(bad)) as c:
        assert c.get("/health").json()["ready"] is False
        assert c.get("/movies/1").status_code == 503


def test_search_endpoint(client):
    body = client.get("/movies/search", params={"q": "space"}).json()
    assert body["auto_resolved"] is False and {r["Movie_ID"] for r in body["results"]} >= {1, 2, 11}
    one = client.get("/movies/search", params={"q": "Galaxy Rescue"}).json()
    assert one["auto_resolved"] is True and one["resolved_movie_id"] == 3
    assert client.get("/movies/search", params={"q": "   "}).status_code == 422
    assert client.get("/movies/search").status_code == 422


def test_movie_detail_and_404(client):
    assert client.get("/movies/1").json()["Title"] == "Space Quest"
    assert client.get("/movies/424242").status_code == 404
    assert client.get("/movies/abc").status_code == 422


def test_similar_endpoint_schema(client):
    r = client.get("/recommendations/movie/1", params={"limit": 3})
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 3 and body["mode"] == "similar"
    first = body["results"][0]
    for key in ("Movie_ID", "Title", "Release_Year", "Genres", "Director", "Vote_Average", "Poster_Web_Path",
                "poster_path", "Similarity_Score", "Score_Components", "Recommendation_Reasons"):
        assert key in first
    assert all(x["Movie_ID"] != 1 for x in body["results"])


def test_similar_endpoint_params_and_errors(client):
    assert client.get("/recommendations/movie/1", params={"limit": 0}).status_code == 422
    assert client.get("/recommendations/movie/1", params={"limit": 101}).status_code == 422
    assert client.get("/recommendations/movie/1", params={"diversity_lambda": 2}).status_code == 422
    assert client.get("/recommendations/movie/999").status_code == 404
    r = client.get("/recommendations/movie/1", params={"exclude_seen": True, "seen": [2, 3], "limit": 20}).json()
    assert not {2, 3} & {x["Movie_ID"] for x in r["results"]}
    warn = client.get("/recommendations/movie/1", params={"exclude_seen": True}).json()["warnings"]
    assert warn


def test_personalized_endpoint(client):
    r = client.post("/recommendations/personalized", json={"profile": {"likes": [4], "dislikes": [6]}, "limit": 3})
    assert r.status_code == 200 and r.json()["count"] == 3
    assert 4 not in [x["Movie_ID"] for x in r.json()["results"]]
    empty = client.post("/recommendations/personalized", json={})
    assert empty.status_code == 200 and empty.json()["fallback_reason"]


def test_personalized_validation_errors(client):
    assert client.post("/recommendations/personalized", json={"profile": {"likes": [1], "dislikes": [1]}}).status_code == 422
    assert client.post("/recommendations/personalized", json={"mode": "nope"}).status_code == 422
    assert client.post("/recommendations/personalized", json={"profile": {"ratings": {"1": 99}}}).status_code == 422
    assert client.post("/recommendations/personalized", json={"mode": "seed"}).status_code == 422
    assert client.post("/recommendations/personalized", json={"mode": "seed", "seed_movie_id": 424242}).status_code == 404
    assert client.post("/recommendations/personalized", json={"unexpected": 1}).status_code == 422


def test_cors_is_not_wildcard_by_default(settings, recommender):
    assert "*" not in settings.cors_origins
    with TestClient(create_app(settings, recommender)) as c:
        ok = c.get("/health", headers={"Origin": "http://localhost:5173"})
        bad = c.get("/health", headers={"Origin": "http://evil.example"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers


def test_artifact_cache_roundtrip_and_invalidation(dataset, settings, tmp_path):
    cached = dataclasses.replace(settings, use_artifact_cache=True, artifacts_dir=tmp_path)
    f1, src1 = get_features(dataset, cached)
    f2, src2 = get_features(dataset, cached)
    assert (src1, src2) == ("built", "cache") and (f1.plot != f2.plot).nnz == 0
    changed = dataclasses.replace(cached, tfidf=dataclasses.replace(cached.tfidf, max_features=50))
    assert get_features(dataset, changed)[1] == "built"      # parameter change -> rebuild
    assert get_features(dataset, cached, force_rebuild=True)[1] == "built"
    (tmp_path / "features.joblib").write_bytes(b"corrupt")
    assert get_features(dataset, cached)[1] == "built"       # corrupt cache never breaks startup


def test_ranking_metrics():
    ranked = [10, 20, 30, 40]
    assert precision_at_k(ranked, {20, 40}, 4) == 0.5
    assert recall_at_k(ranked, {20, 99}, 4) == 0.5
    assert reciprocal_rank(ranked, {30}) == pytest.approx(1 / 3) and reciprocal_rank(ranked, {99}) == 0.0
    assert ndcg_at_k(ranked, {10: 1, 20: 1}, 4) == pytest.approx(1.0)
    assert 0 < ndcg_at_k(ranked, {40: 1}, 4) < 1 and ndcg_at_k(ranked, {}, 4) == 0.0
    with pytest.raises(ValueError):
        precision_at_k(ranked, {1}, 0)
