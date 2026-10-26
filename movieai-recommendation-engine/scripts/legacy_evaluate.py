"""Original (unchanged) evaluation script for the legacy engine in src/recommender.py.

Run from the project root:  python scripts/legacy_evaluate.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.recommender import MovieRecommender
import pandas as pd


def main():
    recommender = MovieRecommender()

    test_movies = [
        "Inception", "Deadpool", "The Notebook", "The Avengers", "The Dark Knight",
        "Titanic", "Interstellar", "Toy Story", "The Matrix", "The Conjuring",
    ]

    results = []

    for movie in test_movies:
        print(f"\n{'=' * 60}")
        print(f"Source movie: {movie}")

        try:
            recommendations = recommender.recommend(movie, top_n=5)

            for rank, (_, row) in enumerate(recommendations.iterrows(), start=1):
                title = row["Title"]
                score = row["Similarity_Score"]
                genres = row.get("Genres", "")

                print(f"{rank}. {title} | Score: {score:.4f}")

                results.append({
                    "Source_Movie": movie,
                    "Rank": rank,
                    "Recommended_Movie": title,
                    "Similarity_Score": score,
                    "Genres": genres,
                })

        except (ValueError, KeyError) as error:
            print(f"Could not evaluate '{movie}': {error}")

    output = "recommendation_evaluation.csv"
    pd.DataFrame(results).to_csv(output, index=False)

    print(f"\nEvaluation complete.")
    print(f"Results saved to: {output}")
    print(f"Total recommendations generated: {len(results)}")


if __name__ == "__main__":
    main()
