"""Content-based recommendation engine for MOVIEAI.

Expected CSV columns: Movie_ID, Title, Movie_Description, Genres, Director.
Compatible with the enriched MOVIEAI dataset.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any
import re

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class MovieRecommender:
    """Recommend similar movies using synopsis, all genres, and director.

    Default similarity weights: 65% synopsis, 30% genres, 5% director.
    These are initial tunable weights, not a claim of validated optimality.
    """

    def __init__(
        self,
        csv_path: str | Path = "data/MOVIEAI_Movies_Enriched_For_Recommendation.csv",
        synopsis_weight: float = 0.65,
        genre_weight: float = 0.30,
        director_weight: float = 0.05,
    ) -> None:
        weights = [synopsis_weight, genre_weight, director_weight]
        if any(w < 0 for w in weights) or sum(weights) <= 0:
            raise ValueError("Similarity weights must be non-negative and sum to more than zero.")
        total = sum(weights)
        self.synopsis_weight, self.genre_weight, self.director_weight = [w / total for w in weights]

        path = Path(csv_path)
        if not path.exists():
            raise FileNotFoundError(
                f"Movie dataset not found: {path.resolve()}\n"
                "Pass the correct csv_path or place the enriched CSV in your data folder."
            )
        self.movies = pd.read_csv(path, low_memory=False)
        required = {"Title"}
        missing = required - set(self.movies.columns)
        if missing:
            raise ValueError(f"CSV is missing required columns: {sorted(missing)}")

        # Ensure the fields used by the model exist, even if a column is absent.
        for col in ["Movie_ID", "Movie_Description", "Genres", "Genre_Group", "Director", "Release_Year"]:
            if col not in self.movies.columns:
                self.movies[col] = ""
        self.movies["Title"] = self.movies["Title"].fillna("").astype(str).str.strip()
        self.movies["_title_key"] = self.movies["Title"].str.casefold()
        self.movies["_description"] = self.movies["Movie_Description"].fillna("").astype(str)
        # Fall back to the primary genre if the full genre list is missing.
        self.movies["_genres"] = self.movies["Genres"].fillna("").astype(str)
        fallback = self.movies["_genres"].str.strip().eq("")
        self.movies.loc[fallback, "_genres"] = self.movies.loc[fallback, "Genre_Group"].fillna("").astype(str)
        self.movies["_genres"] = self.movies["_genres"].str.replace("|", " ", regex=False).str.replace("_", " ", regex=False)
        self.movies["_director"] = self.movies["Director"].fillna("").astype(str)

        self._build_similarity()

    @staticmethod
    def _safe_vectorizer(vectorizer: TfidfVectorizer, texts: pd.Series):
        """Fit TF-IDF safely, including the all-empty-text edge case."""
        values = texts.fillna("").astype(str).tolist()
        if not any(v.strip() for v in values):
            return None
        try:
            matrix = vectorizer.fit_transform(values)
            return cosine_similarity(matrix, dense_output=True)
        except ValueError:
            return None

    def _build_similarity(self) -> None:
        descriptions = self.movies["_description"].str.strip()
        genres = self.movies["_genres"].str.strip()
        directors = self.movies["_director"].str.strip()

        self.description_similarity = self._safe_vectorizer(
            TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=40000),
            descriptions,
        )
        self.genre_similarity = self._safe_vectorizer(
            TfidfVectorizer(token_pattern=r"(?u)\b[\w]+\b", lowercase=True), genres,
        )
        self.director_similarity = self._safe_vectorizer(
            TfidfVectorizer(token_pattern=r"(?u)\b[\w]+\b", lowercase=True), directors,
        )

        n = len(self.movies)
        combined = pd.Series([0.0] * (n * n)).to_numpy().reshape(n, n)
        active_weight = 0.0
        for matrix, weight in [
            (self.description_similarity, self.synopsis_weight),
            (self.genre_similarity, self.genre_weight),
            (self.director_similarity, self.director_weight),
        ]:
            if matrix is not None and weight > 0:
                combined = combined + matrix * weight
                active_weight += weight
        if active_weight:
            combined /= active_weight
        self.similarity = combined

    def find_movies(self, title_query: str, limit: int = 10) -> list[dict[str, Any]]:
        """Find title candidates for search/autocomplete before recommending."""
        query = str(title_query or "").strip().casefold()
        if not query:
            return []
        exact = self.movies[self.movies["_title_key"] == query]
        candidates = exact if not exact.empty else self.movies[self.movies["_title_key"].str.contains(re.escape(query), na=False)]
        columns = [c for c in ["Movie_ID", "Title", "Release_Year", "Genres", "Poster_Web_Path", "poster_path"] if c in candidates.columns]
        return candidates[columns].head(limit).to_dict(orient="records")


    @staticmethod
    def _normalize_title(title: str) -> str:
        """Normalize titles for forgiving search, ignoring leading articles."""
        title = str(title or "").casefold().strip()
        title = re.sub(r"^(the|a|an)\s+", "", title)
        return re.sub(r"[^a-z0-9]+", "", title)

    def _resolve_index(self, movie_title: str) -> int:
        query = str(movie_title or "").strip()
        if not query:
            raise ValueError("Enter a movie title.")

        # 1. Preserve exact title matches whenever possible.
        exact = self.movies.index[
            self.movies["_title_key"] == query.casefold()
        ].tolist()

        if len(exact) == 1:
            return int(exact[0])

        if len(exact) > 1:
            candidates = self.movies.loc[
                exact, ["Movie_ID", "Title", "Release_Year"]
            ].to_dict(orient="records")
            raise ValueError(
                f"Duplicate exact title '{query}'. "
                f"Choose a movie by Movie_ID. Candidates: {candidates}"
            )

        # 2. Match normalized titles, so "Avengers" can match
        #    "The Avengers" without matching the sequel first.
        normalized_query = self._normalize_title(query)
        normalized_titles = self.movies["Title"].map(
            self._normalize_title
        )

        normalized_exact = self.movies.index[
            normalized_titles == normalized_query
        ].tolist()

        if len(normalized_exact) == 1:
            return int(normalized_exact[0])

        if len(normalized_exact) > 1:
            candidates = self.movies.loc[
                normalized_exact, ["Movie_ID", "Title", "Release_Year"]
            ].to_dict(orient="records")
            raise ValueError(
                f"Multiple movies match '{query}'. "
                f"Choose one by Movie_ID. Candidates: {candidates}"
            )

        # 3. For a partial search, prefer the best title match.
        partial = self.movies[
            self.movies["_title_key"].str.contains(
                re.escape(query), na=False
            )
        ].copy()

        if partial.empty:
            # Also allow partial searches after ignoring leading articles.
            partial = self.movies[
                normalized_titles.str.contains(
                    re.escape(normalized_query), na=False
                )
            ].copy()

        if partial.empty:
            raise ValueError(
                f"No movie found matching '{query}'. "
                "Use find_movies() to search titles."
            )

        # Prefer a title that starts with the query, then shorter titles.
        partial["_match_rank"] = partial["Title"].map(
            lambda title: (
                0 if self._normalize_title(title).startswith(
                    normalized_query
                ) else 1,
                len(str(title)),
                str(title).casefold(),
            )
        )
        partial = partial.sort_values(
            "_match_rank", kind="stable"
        )

        # Default to the best-ranked candidate. Alternatives remain
        # available through find_movies(query).
        return int(partial.index[0])


    def _recommend_from_index(self, index: int, top_n: int = 10) -> pd.DataFrame:
        if top_n < 1:
            raise ValueError("top_n must be at least 1.")
        scores = self.similarity[index].copy()
        scores[index] = -1.0  # never recommend the selected movie itself
        ranked_indices = scores.argsort()[::-1][:top_n]
        results = self.movies.iloc[ranked_indices].copy()
        results["Similarity_Score"] = scores[ranked_indices]
        output_columns = [c for c in [
            "Movie_ID", "Title", "Release_Year", "Genres", "Genre_Group", "Director",
            "Vote_Average", "Poster_Web_Path", "poster_path", "Movie_Description", "Similarity_Score"
        ] if c in results.columns]
        return results[output_columns].reset_index(drop=True)

    def recommend(self, movie_title: str, top_n: int = 10) -> pd.DataFrame:
        """Return the top-N similar movies for an exact title."""
        return self._recommend_from_index(self._resolve_index(movie_title), top_n)

    def recommend_by_id(self, movie_id: Any, top_n: int = 10) -> pd.DataFrame:
        """Recommend using Movie_ID, preferred for production integrations."""
        if "Movie_ID" not in self.movies.columns:
            raise ValueError("CSV does not contain Movie_ID.")
        matches = self.movies.index[self.movies["Movie_ID"].astype(str) == str(movie_id)].tolist()
        if not matches:
            raise ValueError(f"No movie found with Movie_ID '{movie_id}'.")
        return self._recommend_from_index(int(matches[0]), top_n)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="MOVIEAI content-based movie recommender")
    parser.add_argument("title", nargs="?", help="Exact movie title to find recommendations for")
    parser.add_argument("--csv", default="data/MOVIEAI_Movies_Enriched_For_Recommendation.csv", help="Path to enriched CSV")
    parser.add_argument("--top", type=int, default=10, help="Number of recommendations")
    args = parser.parse_args()

    recommender = MovieRecommender(args.csv)
    if not args.title:
        print("Try: python src/recommender.py \"Inception\"")
    else:
        print(recommender.recommend(args.title, args.top).to_string(index=False))
