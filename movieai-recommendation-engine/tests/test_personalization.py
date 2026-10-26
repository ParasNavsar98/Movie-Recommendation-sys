import numpy as np
import pytest

from movieai.config import PersonalizationConfig
from movieai.personalization import UserProfile, build_signals, normalize_rating
from movieai.recommender import RecommendationError


def ids(result):
    return [r.movie_id for r in result.items]


def test_rating_normalisation_is_centred():
    cfg = PersonalizationConfig(rating_min=1, rating_max=5)
    assert normalize_rating(3, cfg) == 0 and normalize_rating(5, cfg) == 1 and normalize_rating(1, cfg) == -1


def test_signals_likes_dislikes_ratings(dataset):
    cfg = PersonalizationConfig()
    s = build_signals(UserProfile(likes=[4], favorites=[1], dislikes=[6], ratings={5: 5, 12: 0.5}), dataset, cfg)
    pos = {x.movie_id: x.weight for x in s.positive}
    neg = {x.movie_id: x.weight for x in s.negative}
    assert pos[1] > pos[4] > 0 and pos[5] > 0           # favorite > like; high rating positive
    assert neg[6] < 0 and neg[12] < 0                   # dislike and very low rating negative


def test_watchlist_is_not_watched_and_history_is_weak(dataset):
    cfg = PersonalizationConfig()
    s = build_signals(UserProfile(watchlist=[1], watch_history=[2], likes=[4]), dataset, cfg)
    assert s.watchlist_ids == {1} and 1 not in s.seen_ids
    assert s.seen_ids == {2, 4}
    w = {x.movie_id: x.weight for x in s.positive}
    assert w[2] < w[4] and w[1] < w[4]                  # exposure / intent are weaker than a like


def test_contradictory_and_invalid_input(dataset):
    cfg = PersonalizationConfig()
    with pytest.raises(ValueError):
        build_signals(UserProfile(likes=[1], dislikes=[1]), dataset, cfg)
    with pytest.raises(ValueError):
        build_signals(UserProfile(ratings={1: 9}), dataset, cfg)


def test_unknown_ids_are_ignored_with_warning(recommender):
    res = recommender.personalized(UserProfile(likes=[4, 777777]))
    assert any("unknown" in w.lower() for w in res.warnings) and res.items


def test_likes_drive_recommendations_and_exclude_watched(recommender):
    res = recommender.personalized(UserProfile(likes=[4]), limit=3)
    assert ids(res)[0] in {5, 11, 8} and 4 not in ids(res)
    assert any("which you liked" in r for r in res.items[0].reasons)


def test_dislikes_exclude_and_demote(recommender):
    res = recommender.personalized(UserProfile(likes=[6], dislikes=[7]), limit=10)
    assert 7 not in ids(res) and 6 not in ids(res)
    with_override = recommender.personalized(UserProfile(likes=[6], dislikes=[7]), limit=10, override_exclusions=[7])
    assert 7 in ids(with_override)
    kept = recommender.personalized(UserProfile(likes=[6], dislikes=[7]), limit=10, exclude_disliked=False)
    assert 7 in ids(kept)
    plain = recommender.personalized(UserProfile(likes=[6]), limit=10, override_exclusions=[7])
    s_plain = {r.movie_id: r.score for r in plain.items}[7]
    s_dis = {r.movie_id: r.score for r in with_override.items}[7]
    assert s_dis < s_plain                               # dislike penalises similar movies


def test_negative_signals_cannot_destroy_the_profile(recommender):
    res = recommender.personalized(UserProfile(likes=[4], dislikes=[1, 2, 3, 6, 7, 12]), limit=5)
    assert res.items and res.items[0].score > 0


def test_watchlist_and_history_exclusions(recommender):
    profile = UserProfile(likes=[4], watchlist=[5], watch_history=[11])
    default = ids(recommender.personalized(profile, limit=20))
    assert 11 not in default and 5 in default            # watched excluded; watchlist kept by default
    assert 5 not in ids(recommender.personalized(profile, limit=20, exclude_watchlist=True))
    assert 11 in ids(recommender.personalized(profile, limit=20, exclude_watched=False))
    assert 11 in ids(recommender.personalized(profile, limit=20, override_exclusions=[11]))


def test_no_history_falls_back_without_crashing(recommender):
    res = recommender.personalized(UserProfile(), limit=5)
    assert res.fallback_reason and res.items
    assert all(np.isfinite(r.score) for r in res.items)
    seed = recommender.personalized(UserProfile(), mode="seed", seed_movie_id=1, limit=3)
    plain = recommender.similar_to(1, 3)
    assert seed.fallback_reason and ids(seed) == ids(plain)  # falls back to pure content similarity


def test_seed_mode_blends_content_and_preference(recommender):
    res = recommender.personalized(UserProfile(likes=[4]), mode="seed", seed_movie_id=1, limit=5)
    top = res.items[0]
    assert {"content", "preference"} <= top.components.keys() and 1 not in ids(res)
    cw, pw = 0.7, 0.3
    assert top.score == pytest.approx(cw * top.components["content"] + pw * top.components["preference"], abs=1e-6)


def test_multi_seed_and_discovery_modes(recommender):
    multi = recommender.personalized(UserProfile(), mode="multi_seed", seed_movie_ids=[1, 4], limit=5)
    assert not ({1, 4} & set(ids(multi))) and multi.items
    disc = recommender.personalized(UserProfile(likes=[1, 2]), mode="discovery", limit=5)
    assert all("novelty" in r.components for r in disc.items)


def test_favorite_genres_and_languages(recommender):
    res = recommender.personalized(UserProfile(favorite_genres=["horror", "Nonexistent"], preferred_languages=["English"]), limit=3)
    assert ids(res)[0] in {6, 7}
    assert any("favorite genres" in r for r in res.items[0].reasons)
    assert any("Nonexistent" in w for w in res.warnings)


def test_mode_validation_errors(recommender):
    with pytest.raises(RecommendationError):
        recommender.personalized(UserProfile(), mode="seed")
    with pytest.raises(RecommendationError):
        recommender.personalized(UserProfile(), mode="bogus")
    with pytest.raises(RecommendationError):
        recommender.personalized(UserProfile(likes=[1], dislikes=[1]))
