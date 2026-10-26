"""Integration tests on the real 4,803-movie CSV (skipped automatically if it is absent)."""
import pytest

from movieai.config import DEFAULT_DATA_PATH, Settings
from movieai.evaluation import TEST_MOVIES
from movieai.recommender import Recommender

pytestmark = pytest.mark.skipif(not DEFAULT_DATA_PATH.exists(), reason="real dataset not present")


@pytest.fixture(scope="module")
def rec(tmp_path_factory):
    return Recommender.from_settings(Settings(artifacts_dir=tmp_path_factory.mktemp("art"), use_artifact_cache=False))


def test_dataset_counts(rec):
    r = rec.dataset.report
    assert r.records == 4803 and r.unique_movie_ids == 4803 and r.duplicate_ids == 0


@pytest.mark.parametrize("title", TEST_MOVIES)
def test_every_fixed_test_movie_resolves_and_gets_ten_valid_recommendations(rec, title):
    res = rec.searcher.resolve(title)
    assert res.status == "resolved", f"{title} must resolve to exactly one exact-title record"
    out = rec.similar_to(res.movie_id, 10)
    got = [r.movie_id for r in out.items]
    assert len(got) == 10 and len(set(got)) == 10 and res.movie_id not in got
    assert all(0 <= r.score <= 1 for r in out.items)


def test_avengers_returns_candidates_not_a_silent_guess(rec):
    res = rec.searcher.resolve("Avengers")
    assert res.status == "ambiguous"
    assert [h.title for h in res.candidates[:2]] == ["The Avengers", "Avengers: Age of Ultron"]


def test_sequels_still_surface_without_special_casing(rec):
    toy = rec.searcher.resolve("Toy Story").movie_id
    titles = [r.record["Title"] for r in rec.similar_to(toy, 5).items]
    assert "Toy Story 2" in titles and "Toy Story 3" in titles
    assert any(t not in ("Toy Story 2", "Toy Story 3") for t in titles)  # not only sequels


def test_missing_description_movie_is_handled(rec):
    movie = rec.dataset.df[rec.dataset.df.Description_Clean.isna()].iloc[0]
    out = rec.similar_to(int(movie.Movie_ID), 5)
    assert all(r.score == r.score for r in out.items)  # no NaN
