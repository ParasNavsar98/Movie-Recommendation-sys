import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from movieai.data_loader import DatasetError, load_movies
from movieai.preprocessor import (
    clean_description, looks_english, normalize_title, parse_directors, parse_genres, prepare_plot_text,
    remove_english_stop_words, title_key,
)


def test_loads_fixture_and_reports_counts(dataset):
    r = dataset.report
    assert r.records == 12 and r.unique_movie_ids == 12 and r.duplicate_ids == 0
    assert r.missing_descriptions == 1          # "No Description Film"
    assert r.missing_genres == 1                # "Unknown" is a placeholder, not a genre
    assert r.missing_directors == 1
    assert r.valid_poster_paths == 10
    assert r.duplicate_titles == 2              # two "Haunted House" records
    assert "records" in r.format()


def test_schema_validation_errors(tmp_path):
    with pytest.raises(DatasetError, match="not found"):
        load_movies(tmp_path / "nope.csv")
    bad = tmp_path / "bad.csv"
    pd.DataFrame({"Title": ["A"]}).to_csv(bad, index=False)
    with pytest.raises(DatasetError, match="Movie_ID"):
        load_movies(bad)


def test_missing_optional_columns_are_reported_not_fatal(tmp_path):
    p = tmp_path / "min.csv"
    pd.DataFrame({"Movie_ID": [1, 2], "Title": ["A", "B"]}).to_csv(p, index=False)
    ds = load_movies(p)
    assert "Genres" in ds.report.missing_columns
    assert ds.report.missing_descriptions == 2 and ds.report.missing_genres == 2


def test_duplicate_movie_ids_are_detected_and_not_silently_merged(tmp_path):
    p = tmp_path / "dup.csv"
    pd.DataFrame({"Movie_ID": [1, 1, 2], "Title": ["Same Name", "Other Film", "C"]}).to_csv(p, index=False)
    ds = load_movies(p)
    assert ds.report.duplicate_ids == 1
    detail = ds.report.duplicate_id_details[0]
    assert detail["titles"] == ["Same Name", "Other Film"] and detail["identical_rows"] is False
    assert len(ds) == 2 and ds.df["Movie_ID"].is_unique
    with pytest.raises(DatasetError):
        load_movies(p, on_duplicate_id="error")


def test_invalid_ids_and_years(tmp_path):
    p = tmp_path / "x.csv"
    pd.DataFrame({"Movie_ID": [1, "abc", 3], "Title": ["A", "B", "C"], "Release_Year": [1999, 2000, 3020]}).to_csv(p, index=False)
    ds = load_movies(p)
    assert ds.report.invalid_id_rows_dropped == 1 and len(ds) == 2
    assert ds.report.invalid_or_missing_years == 1   # year 3020 is invalid


def test_source_csv_is_never_modified(csv_path):
    before = hashlib.sha256(Path(csv_path).read_bytes()).hexdigest()
    load_movies(csv_path)
    assert hashlib.sha256(Path(csv_path).read_bytes()).hexdigest() == before


def test_derived_columns_missing_values_not_invented(dataset):
    row = dataset.df[dataset.df.Movie_ID == 8].iloc[0]
    assert pd.isna(row["Description_Clean"]) and row["Plot_Text"] == ""
    row9 = dataset.df[dataset.df.Movie_ID == 9].iloc[0]
    assert row9["Genre_List"] == [] and row9["Genre_Source"] == "missing" and row9["Director_Keys"] == []


def test_record_is_json_safe(dataset):
    rec = dataset.record(dataset.index_of(9))
    assert rec["Genres"] is None and rec["Poster_Web_Path"] is None and rec["Release_Year"] == 2016


def test_clean_description_html_and_placeholders():
    assert clean_description("<p>A  man\n runs &amp; hides.</p><br/>") == "A man runs & hides."
    assert clean_description(None) is None and clean_description(float("nan")) is None
    assert clean_description("MISSING — needs synopsis lookup") is None
    assert clean_description("  ") is None and clean_description("Hi") is None  # too short to be a plot


def test_stop_words_keep_content_words_and_names():
    out = remove_english_stop_words("The fire at the system was found by Bill and Neo")
    assert "fire" in out and "system" in out and "Neo" in out and "Bill" in out and "the" not in out.split()


def test_non_english_descriptions_are_not_stripped():
    text = "Un homme ordinaire cherche un sens a sa vie dans une petite ville de province."
    assert not looks_english(text)
    assert prepare_plot_text(text) == (text, False)
    assert prepare_plot_text(None) == ("", False)


def test_genre_parsing():
    assert parse_genres("Action| science fiction |Action") == ["Action", "Science Fiction"]
    assert parse_genres("Unknown") == [] and parse_genres(None) == [] and parse_genres("tv movie") == ["TV Movie"]


def test_director_parsing_keeps_commas_in_names():
    assert parse_directors("George Tillman, Jr.") == ["george tillman, jr."]
    assert parse_directors("Unknown") == [] and parse_directors("A B|Éric Röhmer") == ["a b", "eric rohmer"]


def test_title_normalisation():
    assert normalize_title("The Matrix") == "matrix" and normalize_title("Amélie") == "amelie"
    assert title_key("Spider-Man") == title_key("Spiderman")
    assert normalize_title("Tom & Jerry") == "tom and jerry"
