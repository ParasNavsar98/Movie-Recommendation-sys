import pytest

from movieai.search import TitleSearcher


@pytest.fixture(scope="module")
def searcher(dataset):
    return TitleSearcher(dataset)


def test_exact_title_auto_resolves_when_unique(searcher):
    res = searcher.resolve("Galaxy Rescue")
    assert res.status == "resolved" and res.movie_id == 3


def test_case_insensitive_and_whitespace(searcher):
    assert searcher.resolve("  galaxy RESCUE ").movie_id == 3


def test_partial_search_returns_candidates_and_is_not_auto_resolved(searcher):
    res = searcher.resolve("space")
    assert res.status == "ambiguous" and res.movie_id is None
    assert {h.movie_id for h in res.candidates} >= {1, 2, 11}


def test_exact_match_is_ranked_before_prefix_matches(searcher):
    hits = searcher.search("space quest")
    assert hits[0].movie_id == 1 and hits[0].match_type == "exact"
    assert any(h.movie_id == 2 and h.match_type == "prefix" for h in hits)


def test_leading_article_is_ignored_but_not_auto_selected(searcher):
    hits = searcher.search("space between")
    assert hits[0].movie_id == 11
    res = searcher.resolve("Space Between")
    assert res.status == "ambiguous" and res.candidates[0].movie_id == 11  # normalised, not exact -> user confirms


def test_duplicate_titles_with_different_years_are_ambiguous(searcher):
    res = searcher.resolve("Haunted House")
    assert res.status == "ambiguous"
    assert {(h.movie_id, h.year) for h in res.candidates[:2]} == {(6, 2013), (7, 1990)}


def test_year_hint_disambiguates(searcher):
    res = searcher.resolve("Haunted House (1990)")
    assert res.status == "resolved" and res.movie_id == 7


def test_not_found_and_invalid_input(searcher):
    assert searcher.resolve("zzzzqqqq").status == "not_found"
    with pytest.raises(ValueError):
        searcher.search("   ")
    with pytest.raises(ValueError):
        searcher.search("x", limit=0)


def test_typo_tolerance_is_a_last_resort_and_never_auto_resolves(searcher):
    res = searcher.resolve("Galaxy Rescu")
    assert res.status == "ambiguous" and res.candidates[0].movie_id == 3


def test_search_result_fields(searcher):
    d = searcher.search("Comedy Night")[0].to_dict()
    assert {"Movie_ID", "Title", "Release_Year", "Poster_Web_Path", "poster_path", "Genres"} <= d.keys()
    assert d["Poster_Web_Path"] is None  # missing poster stays None
