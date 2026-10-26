import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { movieAiApi, type RecommendationResponse } from "@/lib/api-client";
import { catalogueMovies } from "@/data/catalogue-data";

async function renderWithRouter(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />, {
    container: document.documentElement,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MovieAI Recommendation Integration & Poster Verification", () => {
  it("verifies representative sample of movies have matching IDs, titles and poster paths", () => {
    const testCases = [
      { id: "293660", title: "Deadpool", expectedPoster: "/posters/Deadpool_293660.jpg" },
      { id: "24428", title: "The Avengers", expectedPoster: "/posters/The_Avengers_24428.jpg" },
      { id: "27205", title: "Inception", expectedPoster: "/posters/Inception_27205.jpg" },
      { id: "155", title: "The Dark Knight", expectedPoster: "/posters/The_Dark_Knight_155.jpg" },
      { id: "157336", title: "Interstellar", expectedPoster: "/posters/Interstellar_157336.jpg" },
    ];

    for (const tc of testCases) {
      const match = catalogueMovies.find((m) => m.id === tc.id);
      expect(match).toBeDefined();
      expect(match?.title).toBe(tc.title);
      expect(match?.posterUrl).toBe(tc.expectedPoster);
    }
  });

  it("handles API client requests and response formatting", async () => {
    const mockFeedResponse: RecommendationResponse = {
      mode: "profile",
      seed_movie_id: null,
      count: 2,
      fallback_reason: null,
      warnings: [],
      excluded_count: 0,
      results: [
        {
          Movie_ID: 155,
          Title: "The Dark Knight",
          Release_Year: 2008,
          Genres: "Drama|Action|Crime|Thriller",
          Director: "Christopher Nolan",
          Vote_Average: 8.2,
          Poster_Web_Path: "/posters/The_Dark_Knight_155.jpg",
          poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
          Similarity_Score: 0.88,
          Score_Components: { content: 0.88 },
          Ranking_Components: {},
          Recommendation_Reasons: ["Similar to Inception which you liked"],
        },
        {
          Movie_ID: 24428,
          Title: "The Avengers",
          Release_Year: 2012,
          Genres: "Science Fiction|Action|Adventure",
          Director: "Joss Whedon",
          Vote_Average: 7.4,
          Poster_Web_Path: "/posters/The_Avengers_24428.jpg",
          poster_path: "/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
          Similarity_Score: 0.75,
          Score_Components: { content: 0.75 },
          Ranking_Components: {},
          Recommendation_Reasons: ["Shared genres: Action, Sci-Fi"],
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/health")) {
        return {
          ok: true,
          json: async () => ({ status: "ok", ready: true, movies: 4803 }),
        } as Response;
      }
      if (urlStr.includes("/recommendations/feed")) {
        return {
          ok: true,
          json: async () => mockFeedResponse,
        } as Response;
      }
      if (urlStr.includes("/interactions/")) {
        return {
          ok: true,
          json: async () => ({ status: "ok", movie_id: 155, interaction_type: "like", active: true }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    const feed = await movieAiApi.fetchFeed();
    expect(feed.results.length).toBe(2);
    expect(feed.results[0].Title).toBe("The Dark Knight");
    expect(feed.results[0].Similarity_Score).toBe(0.88);

    const likeResult = await movieAiApi.toggleLike(155);
    expect(likeResult.active).toBe(true);
    expect(likeResult.movie_id).toBe(155);
  });

  it("renders Explore page for catalogue browsing, interactions, and linking to For You", async () => {
    const { getByText, getAllByText } = await renderWithRouter("/explore");

    await waitFor(() => {
      expect(getAllByText(/Explore Movies/i).length).toBeGreaterThan(0);
      expect(getAllByText(/For You/i).length).toBeGreaterThan(0);
      expect(getAllByText(/Action/i).length).toBeGreaterThan(0);
    });
  });

  it("renders dedicated genre-wise recommendations feed and reasons on the For You page", async () => {
    const mockFeedResponse: RecommendationResponse = {
      mode: "profile",
      seed_movie_id: null,
      count: 2,
      fallback_reason: null,
      warnings: [],
      excluded_count: 0,
      results: [
        {
          Movie_ID: 155,
          Title: "The Dark Knight",
          Release_Year: 2008,
          Genres: "Action|Crime|Drama",
          Director: "Christopher Nolan",
          Vote_Average: 8.5,
          Poster_Web_Path: "/posters/The_Dark_Knight_155.jpg",
          poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
          Similarity_Score: 0.94,
          Score_Components: { content: 0.94 },
          Ranking_Components: {},
          Recommendation_Reasons: ["High match to your Action preference"],
        },
        {
          Movie_ID: 293660,
          Title: "Deadpool",
          Release_Year: 2016,
          Genres: "Action|Adventure|Comedy",
          Director: "Tim Miller",
          Vote_Average: 7.4,
          Poster_Web_Path: "/posters/Deadpool_293660.jpg",
          poster_path: "/3E53WEZJqP6aM84D8CckXx4pIHw.jpg",
          Similarity_Score: 0.89,
          Score_Components: { content: 0.89 },
          Ranking_Components: {},
          Recommendation_Reasons: ["Shared terms: mercenary, rogue"],
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/health")) {
        return {
          ok: true,
          json: async () => ({ status: "ok", ready: true, movies: 4803 }),
        } as Response;
      }
      if (urlStr.includes("/recommendations/feed")) {
        return {
          ok: true,
          json: async () => mockFeedResponse,
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          user_id: "test",
          name: "",
          email: "",
          likes: [],
          dislikes: [],
          favorites: [],
          watchlist: [],
          watched: [],
          history: [],
          ratings: {},
          favorite_genres: [],
          preferred_languages: [],
        }),
      } as Response;
    });

    const { getByText, getAllByText } = await renderWithRouter("/discover");

    await waitFor(() => {
      expect(getAllByText(/For You/i).length).toBeGreaterThan(0);
      expect(getByText(/Action for You/i)).toBeDefined();
      expect(getAllByText(/The Dark Knight/i).length).toBeGreaterThan(0);
      expect(getAllByText(/Deadpool/i).length).toBeGreaterThan(0);
      expect(getByText(/94% Match/i)).toBeDefined();
      expect(getByText(/High match to your Action preference/i)).toBeDefined();
    });
  });

  it("renders offline banner gracefully on For You when recommendation engine is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("Failed to fetch");
    });

    const { getByText, getAllByText } = await renderWithRouter("/discover");

    await waitFor(() => {
      expect(getByText(/FastAPI Engine Offline or Reconnecting/i)).toBeDefined();
      expect(getByText(/Retry Connection/i)).toBeDefined();
      expect(getAllByText(/For You/i).length).toBeGreaterThan(0);
    });
  });
});
