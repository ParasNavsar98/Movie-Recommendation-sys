import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { realMovies, getMovieById } from "@/components/movieai/discover-data";

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
});

describe("Discover / For You Real Movie Integration", () => {
  it("provides 4,803 real catalogue movies to the discover dataset", () => {
    expect(realMovies.length).toBe(4803);
    const deadpool = getMovieById("293660");
    expect(deadpool).toBeDefined();
    expect(deadpool?.title).toBe("Deadpool");
    expect(deadpool?.year).toBe(2016);
    expect(deadpool?.image).toBe("/posters/Deadpool_293660.jpg");
    expect(deadpool?.hasPoster).toBe(true);
  });

  it("maps real poster URLs starting with /posters/ for movies with posters", () => {
    const moviesWithPosters = realMovies.filter((m) => m.hasPoster && m.image);
    expect(moviesWithPosters.length).toBeGreaterThan(4500);
    expect(moviesWithPosters[0].image.startsWith("/posters/")).toBe(true);
  });

  it("renders the For You page with real catalogue content", async () => {
    const { getByText } = await renderWithRouter("/discover");

    // Check that discover page rendered
    await waitFor(() => {
      expect(getByText(/Recommended for you/i)).toBeDefined();
      expect(getByText(/Top pick for you/i)).toBeDefined();
      expect(getByText(/Curated Catalogue/i)).toBeDefined();
    });
  });
});
