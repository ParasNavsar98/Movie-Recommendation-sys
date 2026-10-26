"""Shared small fixtures: a 12-movie synthetic dataset so tests never rebuild the full model."""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from movieai.config import Settings, TfidfConfig  # noqa: E402
from movieai.data_loader import load_movies  # noqa: E402
from movieai.feature_builder import build_features  # noqa: E402
from movieai.recommender import Recommender  # noqa: E402

ROWS = [
    # id, title, year, genres, director, description, language, votes, avg, poster
    (1, "Space Quest", 2001, "Science Fiction|Adventure", "Ann Lee", "A crew of astronauts travels through a wormhole to save humanity from a dying Earth.", "English", 5000, 8.0, "/p1.jpg"),
    (2, "Space Quest 2", 2004, "Science Fiction|Adventure", "Ann Lee", "The astronauts return through the wormhole to rescue colonists stranded near a dying star.", "English", 3000, 7.5, "/p2.jpg"),
    (3, "Galaxy Rescue", 2010, "Science Fiction|Action", "Bo Chan", "An astronaut crew races through deep space to save humanity from a failing colony.", "English", 800, 6.8, "/p3.jpg"),
    (4, "The Notebook Diary", 2004, "Drama|Romance", "Cy Dunn", "An elderly man reads a love story to a woman with dementia, recalling their summer romance.", "English", 4000, 7.9, "/p4.jpg"),
    (5, "Summer Love", 2012, "Drama|Romance", "Di Evans", "Two teenagers fall in love during one summer and must decide whether to stay together.", "English", 900, 6.5, "/p5.jpg"),
    (6, "Haunted House", 2013, "Horror|Thriller", "Ed Fox", "A family moves into a house haunted by a vengeful ghost and calls in paranormal investigators.", "English", 2500, 7.1, "/p6.jpg"),
    (7, "Haunted House", 1990, "Horror", "Fay Gray", "Teenagers spend the night in an abandoned house haunted by a vengeful spirit.", "English", 300, 5.9, "/p7.jpg"),
    (8, "No Description Film", 2015, "Drama|Romance", "Di Evans", None, "English", 100, 6.0, "/p8.jpg"),
    (9, "Mystery Genre Missing", 2016, "Unknown", "Unknown", "A detective investigates a mysterious disappearance in a small coastal town.", "English", 200, 6.2, None),
    (10, "La Vie Quotidienne", 2008, "Drama", "Gil Hart", "Un homme ordinaire cherche un sens a sa vie dans une petite ville de province.", "French", 150, 7.0, "/p10.jpg"),
    (11, "The Space Between", 2018, "Drama|Romance", "Hal Ives", "Two astronauts fall in love aboard a space station orbiting a dying Earth.", "English", 700, 6.9, "/p11.jpg"),
    (12, "Comedy Night", 2019, "Comedy", "Ivy Jones", "A stand-up comedian bombs on stage and rebuilds a career through absurd gigs.", "English", 600, 6.4, None),
]


@pytest.fixture(scope="session")
def csv_path(tmp_path_factory) -> Path:
    cols = ["Movie_ID", "Title", "Release_Year", "Genres", "Director", "Movie_Description", "Language",
            "Vote_Count", "Vote_Average", "Poster_Web_Path"]
    frame = pd.DataFrame(ROWS, columns=cols)
    frame["Popularity"] = frame["Vote_Count"] / 100
    frame["poster_path"] = frame["Poster_Web_Path"]
    frame["Runtime_Min"] = 100.0
    path = tmp_path_factory.mktemp("data") / "movies.csv"
    frame.to_csv(path, index=False)
    return path


@pytest.fixture(scope="session")
def settings(csv_path, tmp_path_factory) -> Settings:
    return Settings(data_path=csv_path, artifacts_dir=tmp_path_factory.mktemp("art"),
                    reports_dir=tmp_path_factory.mktemp("rep"), tfidf=TfidfConfig(min_df=1),
                    use_artifact_cache=False)


@pytest.fixture(scope="session")
def dataset(csv_path):
    return load_movies(csv_path)


@pytest.fixture(scope="session")
def recommender(settings) -> Recommender:
    return Recommender.from_settings(settings)


@pytest.fixture(scope="session")
def features(dataset, settings):
    return build_features(dataset, settings)
