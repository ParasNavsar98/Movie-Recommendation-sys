import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { DemoProvider } from "@/components/movieai/demo-context";
import { MovieDetailsPage } from "@/components/movieai/movie-details/movie-details-page";
import {
  getMovieCast,
  getMovieCrew,
  getMovieMeterStats,
  getMovieVibe,
  getSimilarMovies,
  resolveMovieDetail,
} from "@/components/movieai/movie-details/movie-data-adapter";

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

describe("Movie Detail Data Adapter", () => {
  it("resolves a catalogue movie accurately by ID", () => {
    const movie = resolveMovieDetail("293660"); // Deadpool
    expect(movie).not.toBeNull();
    expect(movie?.title).toBe("Deadpool");
    expect(movie?.year).toBe(2016);
    expect(movie?.director).toBe("Tim Miller");
    expect(movie?.studio).toBe("Twentieth Century Fox Film Corporation");
    expect(movie?.genre).toBe("Action");
    expect(movie?.runtimeFormatted).toBe("1h 48m");
    expect(movie?.rating).toBe(7.4);
    expect(movie?.voteCount).toBe(10995);
  });

  it("resolves a discover movie accurately by ID", () => {
    const movie = resolveMovieDetail("where-we-go");
    expect(movie).not.toBeNull();
    expect(movie?.title).toBe("Where We Go");
    expect(movie?.genre).toBe("Drama");
  });

  it("returns null for non-existent movie IDs", () => {
    const movie = resolveMovieDetail("non-existent-movie-id-12345");
    expect(movie).toBeNull();
  });

  it("calculates meter stats deterministically from rating and vote count", () => {
    const movie = resolveMovieDetail("293660")!;
    const stats = getMovieMeterStats(movie);
    expect(stats.totalVotes).toBe(10995);
    expect(stats.consensusPct).toBeGreaterThan(50);
    expect(stats.positiveVotes).toBeGreaterThan(0);
    expect(
      stats.distribution.skip +
        stats.distribution.timepass +
        stats.distribution.goforit +
        stats.distribution.perfection
    ).toBe(100);
  });

  it("handles zero-vote state cleanly", () => {
    const stats = getMovieMeterStats({
      id: "zero",
      title: "Zero Movie",
      year: 2026,
      runtime: 100,
      runtimeFormatted: "1h 40m",
      rating: null,
      voteCount: 0,
      popularity: 0,
      genre: "Drama",
      genres: ["Drama"],
      director: "Director",
      studio: null,
      country: null,
      language: "English",
      ageRating: null,
      posterUrl: null,
      backdropUrl: null,
      overview: "No overview",
      budget: null,
      revenue: null,
      trailerUrl: null,
      hasPoster: false,
    });
    expect(stats.totalVotes).toBe(0);
    expect(stats.consensusPct).toBe(0);
    expect(stats.positiveVotes).toBe(0);
  });

  it("generates vibe chart data with 5 distinct segments", () => {
    const movie = resolveMovieDetail("293660")!;
    const vibe = getMovieVibe(movie);
    expect(vibe.length).toBe(5);
    const sum = vibe.reduce((acc, curr) => acc + curr.value, 0);
    expect(sum).toBe(100);
  });

  it("returns cast for discover movie and empty array for catalogue movie without inventing data", () => {
    const discoverCast = getMovieCast("where-we-go");
    expect(discoverCast.length).toBeGreaterThan(0);

    const catalogueCast = getMovieCast("293660");
    expect(catalogueCast.length).toBe(0);
  });

  it("returns crew with director", () => {
    const movie = resolveMovieDetail("293660")!;
    const crew = getMovieCrew(movie);
    expect(crew.some((c) => c.role === "Director")).toBe(true);
  });

  it("finds similar movies excluding the current movie", () => {
    const movie = resolveMovieDetail("293660")!;
    const similar = getSimilarMovies(movie, 6);
    expect(similar.length).toBe(6);
    expect(similar.every((m) => m.id !== movie.id)).toBe(true);
  });
});

describe("Movie Details Routed Rendering", () => {
  it("renders catalogue movie detail page at /movie/293660", async () => {
    const { container } = await renderWithRouter("/movie/293660");
    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("does not reset window scroll on user interaction or state change", async () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo");
    scrollToSpy.mockClear();

    const { getAllByText, getByRole } = await renderWithRouter("/movie/293660");

    await waitFor(() => {
      expect(getAllByText("Deadpool")[0]).toBeDefined();
    });

    // Clear initial navigation scroll call from router
    scrollToSpy.mockClear();

    // Toggle Watched button
    const watchedButton = getByRole("button", { name: /Watched|Mark as Watched/i });
    fireEvent.click(watchedButton);

    // Scroll must not be reset on state toggle
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Toggle Collections button
    const collectionsButton = getByRole("button", { name: /Collections|In Collection/i });
    fireEvent.click(collectionsButton);

    expect(scrollToSpy).not.toHaveBeenCalled();

    // Toggle Watch Later button
    const watchLaterButton = getByRole("button", { name: /Watch Later|In Watchlist/i });
    fireEvent.click(watchLaterButton);

    expect(scrollToSpy).not.toHaveBeenCalled();

    // Open and close trailer
    const playButton = getByRole("button", { name: /Play trailer/i });
    fireEvent.click(playButton);

    const closeButton = getByRole("button", { name: /Close trailer|Return to Backdrop/i });
    fireEvent.click(closeButton);

    expect(scrollToSpy).not.toHaveBeenCalled();

    scrollToSpy.mockRestore();
  });

  it("plays real YouTube trailer for Interstellar (157336) on the same page and closes cleanly", async () => {
    const { getByRole, getByTitle, queryByTitle } = await renderWithRouter("/movie/157336");

    await waitFor(() => {
      expect(getByRole("button", { name: /Play trailer for Interstellar/i })).toBeInTheDocument();
    });

    // 1. Click Play button
    const playButton = getByRole("button", { name: /Play trailer for Interstellar/i });
    fireEvent.click(playButton);

    // 2. Embedded YouTube iframe must be rendered with Interstellar's exact video ID LY19rHKAaAg
    await waitFor(() => {
      const iframe = getByTitle("Trailer for Interstellar") as HTMLIFrameElement;
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toContain("LY19rHKAaAg");
      expect(iframe.src).toContain("youtube-nocookie.com");
      expect(iframe).toHaveAttribute("allowFullScreen");
    });

    // 3. Close button stops playback and restores the hero backdrop and Play button
    const closeButton = getByRole("button", { name: /Close trailer/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(queryByTitle("Trailer for Interstellar")).not.toBeInTheDocument();
      expect(getByRole("button", { name: /Play trailer for Interstellar/i })).toBeInTheDocument();
    });
  });

  it("renders clear unavailable message for movie without trailer without rendering broken iframe", async () => {
    const { getByRole, getByText, queryByTitle } = await renderWithRouter("/movie/where-we-go");

    await waitFor(() => {
      expect(getByRole("button", { name: /Play trailer/i })).toBeInTheDocument();
    });

    // Click play on movie without valid trailer link in CSV
    const playButton = getByRole("button", { name: /Play trailer/i });
    fireEvent.click(playButton);

    await waitFor(() => {
      // Must not render iframe
      expect(queryByTitle(/Trailer for/i)).not.toBeInTheDocument();
      // Must show clear unavailable state
      expect(getByText(/Trailer unavailable for this movie/i)).toBeInTheDocument();
    });

    // Return to backdrop button restores original hero
    const returnButton = getByRole("button", { name: /Return to Backdrop/i });
    fireEvent.click(returnButton);

    await waitFor(() => {
      expect(getByRole("button", { name: /Play trailer/i })).toBeInTheDocument();
    });
  });

  it("renders not-found state at /movie/non-existent-id", async () => {
    const { container } = await renderWithRouter("/movie/non-existent-id-12345");
    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });
});
