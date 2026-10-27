import { describe, expect, it } from "vitest";
import {
  buildYouTubeEmbedUrl,
  extractYouTubeVideoId,
  getMovieTrailer,
  getMovieTrailerRecord,
  parseMovieTrailersCsv,
} from "@/lib/trailers";

describe("Movie Trailers Integration — TMDB ID & YouTube Embed", () => {
  describe("extractYouTubeVideoId", () => {
    it("extracts ID from standard watch URL", () => {
      expect(
        extractYouTubeVideoId("https://www.youtube.com/watch?v=LY19rHKAaAg")
      ).toBe("LY19rHKAaAg");
    });

    it("extracts ID from watch URL with extra query parameters", () => {
      expect(
        extractYouTubeVideoId(
          "https://www.youtube.com/watch?v=LY19rHKAaAg&feature=youtu.be&t=45s"
        )
      ).toBe("LY19rHKAaAg");
    });

    it("extracts ID from short youtu.be URL", () => {
      expect(extractYouTubeVideoId("https://youtu.be/LY19rHKAaAg")).toBe(
        "LY19rHKAaAg"
      );
    });

    it("extracts ID from embed URL", () => {
      expect(
        extractYouTubeVideoId("https://www.youtube.com/embed/LY19rHKAaAg")
      ).toBe("LY19rHKAaAg");
    });

    it("returns null for NOT FOUND", () => {
      expect(extractYouTubeVideoId("NOT FOUND")).toBeNull();
      expect(extractYouTubeVideoId("not found")).toBeNull();
    });

    it("returns null for empty or invalid strings", () => {
      expect(extractYouTubeVideoId("")).toBeNull();
      expect(extractYouTubeVideoId("   ")).toBeNull();
      expect(extractYouTubeVideoId(null)).toBeNull();
      expect(extractYouTubeVideoId(undefined)).toBeNull();
    });

    it("returns null for non-YouTube domains", () => {
      expect(
        extractYouTubeVideoId("https://vimeo.com/123456789")
      ).toBeNull();
      expect(
        extractYouTubeVideoId("https://malicious-site.com/watch?v=LY19rHKAaAg")
      ).toBeNull();
    });

    it("returns null for invalid video ID format", () => {
      expect(
        extractYouTubeVideoId("https://www.youtube.com/watch?v=short")
      ).toBeNull();
      expect(
        extractYouTubeVideoId("https://www.youtube.com/watch?v=too_long_to_be_a_youtube_id_12345")
      ).toBeNull();
    });
  });

  describe("buildYouTubeEmbedUrl", () => {
    it("builds privacy-enhanced embed URL with autoplay", () => {
      const url = buildYouTubeEmbedUrl("LY19rHKAaAg", { autoplay: true });
      expect(url).toContain("https://www.youtube-nocookie.com/embed/LY19rHKAaAg");
      expect(url).toContain("autoplay=1");
      expect(url).toContain("rel=0");
    });

    it("builds embed URL without autoplay when requested", () => {
      const url = buildYouTubeEmbedUrl("LY19rHKAaAg", { autoplay: false });
      expect(url).toContain("autoplay=0");
    });
  });

  describe("Interstellar (157336) verification", () => {
    it("accurately finds Interstellar by TMDB ID 157336 with exact video ID", () => {
      const trailer = getMovieTrailer(157336);
      expect(trailer).not.toBeNull();
      expect(trailer?.movieId).toBe(157336);
      expect(trailer?.movieName).toBe("Interstellar");
      expect(trailer?.videoId).toBe("LY19rHKAaAg");
      expect(trailer?.trailerLink).toBe("https://www.youtube.com/watch?v=LY19rHKAaAg");
      expect(trailer?.embedUrl).toContain("LY19rHKAaAg");
      expect(trailer?.isAvailable).toBe(true);
    });

    it("matches TMDB ID whether passed as number, string, or padded string", () => {
      const byNum = getMovieTrailer(157336);
      const byStr = getMovieTrailer("157336");
      const byPadded = getMovieTrailer("  157336  ");

      expect(byNum).toEqual(byStr);
      expect(byNum).toEqual(byPadded);
    });
  });

  describe("Handles movies with commas in titles", () => {
    it("correctly parses movie title with comma such as I, Robot (2048)", () => {
      const trailer = getMovieTrailer(2048);
      expect(trailer).not.toBeNull();
      expect(trailer?.movieId).toBe(2048);
      expect(trailer?.movieName).toBe("I, Robot");
      expect(trailer?.videoId).toBe("ry1N9lrzt7A");
    });
  });

  describe("Handles missing and NOT FOUND trailers safely", () => {
    it("returns null for Baahubali: The Beginning (256040) which is NOT FOUND", () => {
      const trailer = getMovieTrailer(256040);
      expect(trailer).toBeNull();

      const rawRecord = getMovieTrailerRecord(256040);
      expect(rawRecord).not.toBeNull();
      expect(rawRecord?.trailerLink).toBe("NOT FOUND");
      expect(rawRecord?.isAvailable).toBe(false);
    });

    it("returns null for non-existent movie ID and never substitutes another movie", () => {
      const trailer = getMovieTrailer(99999999);
      expect(trailer).toBeNull();
    });

    it("returns null for invalid or null ID", () => {
      expect(getMovieTrailer(null)).toBeNull();
      expect(getMovieTrailer(undefined)).toBeNull();
      expect(getMovieTrailer("")).toBeNull();
      expect(getMovieTrailer("not-a-number")).toBeNull();
    });
  });

  describe("parseMovieTrailersCsv custom input", () => {
    it("safely handles custom CSV text without throwing", () => {
      const customCsv = `Movie_ID,Movie_Name,Trailer_Link
100,Sample Movie,https://www.youtube.com/watch?v=abcdefghijk
200,"Movie, With, Comma",https://youtu.be/1234567890a
300,No Link,NOT FOUND
`;
      const map = parseMovieTrailersCsv(customCsv);
      expect(map.size).toBe(3);
      expect(map.get("100")?.videoId).toBe("abcdefghijk");
      expect(map.get("200")?.movieName).toBe("Movie, With, Comma");
      expect(map.get("200")?.videoId).toBe("1234567890a");
      expect(map.get("300")?.isAvailable).toBe(false);
    });
  });
});
