import dataclasses

import numpy as np
import pytest

from movieai.config import SimilarityWeights
from movieai.feature_builder import get_features
from movieai.recommender import RecommendationError, Recommender


def ids(result):
    return [r.movie_id for r in result.items]


def test_never_recommends_itself_and_no_duplicates(recommender):
    for movie_id in range(1, 13):
        res = recommender.similar_to(movie_id, 20)
        assert movie_id not in ids(res)
        assert len(ids(res)) == len(set(ids(res)))


def test_relevant_movie_ranks_first(recommender):
    res = recommender.similar_to(1, 5)
    assert set(ids(res)[:2]) == {2, 3}           # the sequel and the space-rescue film outrank romance/horror
    sequel = next(r for r in res.items if r.movie_id == 2)
    assert "Same director: Ann Lee" in sequel.reasons


def test_limit_is_respected_and_fewer_returned_when_few_candidates(recommender):
    assert len(recommender.similar_to(1, 3).items) == 3
    big = recommender.similar_to(1, 100)
    assert 0 < len(big.items) < 100
    assert recommender.similar_to(1, 1).items[0].movie_id == ids(big)[0]


def test_scores_are_finite_bounded_and_sorted(recommender):
    for movie_id in range(1, 13):
        scores = [r.score for r in recommender.similar_to(movie_id, 20).items]
        assert all(np.isfinite(scores)) and all(0.0 <= s <= 1.0 for s in scores)
        assert scores == sorted(scores, reverse=True)
        for r in recommender.similar_to(movie_id, 5).items:
            assert all(np.isfinite(v) for v in r.components.values())


def test_deterministic_output(recommender):
    a = [(r.movie_id, r.score) for r in recommender.similar_to(4, 10).items]
    b = [(r.movie_id, r.score) for r in recommender.similar_to(4, 10).items]
    assert a == b


def test_deterministic_across_independent_builds(settings):
    r1, r2 = Recommender.from_settings(settings), Recommender.from_settings(settings)
    assert [(x.movie_id, x.score) for x in r1.similar_to(1, 8).items] == [(x.movie_id, x.score) for x in r2.similar_to(1, 8).items]


def test_seed_without_description_uses_remaining_signals_without_lowering_scores(recommender):
    res = recommender.similar_to(8, 3)           # no description; shares genres + director with movie 5
    assert ids(res)[0] == 5
    assert res.items[0].score == pytest.approx(1.0)  # missing plot must not drag scores down
    assert any("no usable description" in w for w in res.warnings)


def test_candidate_without_description_gets_no_plot_credit(recommender):
    res = recommender.similar_to(4, 20)
    by_id = {r.movie_id: r for r in res.items}
    assert by_id[8].score <= 0.26                # genre only (0.25 weight); not inflated to ~0.8
    assert by_id[8].components["plot"] == 0.0 and by_id[8].score < by_id[5].score


def test_seed_without_genre_or_director_works_on_plot(recommender):
    res = recommender.similar_to(9, 5)
    assert all(np.isfinite(r.score) for r in res.items)
    assert res.items == [] or all(r.components["genre"] == 0 for r in res.items)


def test_unknown_movie_and_invalid_params(recommender):
    with pytest.raises(RecommendationError):
        recommender.similar_to(999999)
    with pytest.raises(RecommendationError):
        recommender.similar_to(1, 0)
    with pytest.raises(RecommendationError):
        recommender.similar_to(1, 5, diversity_lambda=1.5)


def test_exclude_ids_and_language_filter(recommender):
    base = ids(recommender.similar_to(1, 20))
    res = recommender.similar_to(1, 20, exclude_ids=[2, 424242])
    assert 2 not in ids(res) and res.excluded_count == 1 and len(ids(res)) == len(base) - 1
    fr = recommender.similar_to(1, 20, language="french")
    assert all(r.record["Language"] == "French" for r in fr.items)


def test_diversity_mmr_changes_order_but_keeps_validity(recommender):
    plain = recommender.similar_to(1, 5, diversity_lambda=1.0)
    diverse = recommender.similar_to(1, 5, diversity_lambda=0.3)
    assert ids(plain)[0] == ids(diverse)[0]       # most relevant item stays first
    assert len(set(ids(diverse))) == len(ids(diverse)) and 1 not in ids(diverse)


def test_component_scores_and_reasons_are_present_and_supported(recommender):
    item = recommender.similar_to(1, 3).items[0]
    assert {"content", "plot", "plot_raw", "genre", "director"} <= item.components.keys()
    assert item.reasons and all(isinstance(r, str) for r in item.reasons)
    # a reason must only mention shared genres that really are shared
    shared = [r for r in item.reasons if r.startswith("Shared genres")]
    assert shared and "Science Fiction" in shared[0]


def test_no_hidden_popularity_boost_by_default(recommender):
    res = recommender.similar_to(1, 5)
    assert all(r.ranking_components == {} for r in res.items)
    assert all(r.score == pytest.approx(r.components["content"]) for r in res.items)


def test_optional_ranking_signals_are_visible_and_independent(settings, dataset, features):
    cfg = dataclasses.replace(settings, ranking=dataclasses.replace(settings.ranking, popularity_weight=1.0, quality_weight=0.5))
    rec = Recommender(dataset, features, cfg)
    item = rec.similar_to(1, 3).items[0]
    assert set(item.ranking_components) == {"quality", "popularity"}
    assert 0 <= item.score <= 1 and item.components["content"] != item.score


def test_weights_are_configurable_and_normalised(dataset, settings):
    with pytest.raises(ValueError):
        SimilarityWeights(-1, 1, 1).validate()
    with pytest.raises(ValueError):
        SimilarityWeights(0, 0, 0).normalized()
    only_genre = dataclasses.replace(settings, weights=SimilarityWeights(0, 1, 0))
    feats, _ = get_features(dataset, only_genre)
    rec = Recommender(dataset, feats, only_genre)
    top = rec.similar_to(4, 3).items[0]
    assert top.components["genre"] == pytest.approx(top.score)


def test_health(recommender):
    h = recommender.health()
    assert h["status"] == "ok" and h["movies"] == 12
