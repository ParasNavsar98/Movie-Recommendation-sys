/**
 * Utility for parsing and matching movie trailers from movie_trailers.csv.
 * Matches movies by numeric TMDB Movie_ID and provides validated YouTube embed URLs.
 */
import rawTrailerCsv from "@/data/movie_trailers.csv?raw";

export interface MovieTrailerRecord {
  movieId: number;
  movieName: string;
  trailerLink: string;
  videoId: string | null;
  embedUrl: string | null;
  isAvailable: boolean;
}

/**
 * Validates YouTube URL host and extracts YouTube video ID.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - http(s) variations, m.youtube.com, youtube-nocookie.com
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.toUpperCase() === "NOT FOUND") return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const validHosts = [
      "www.youtube.com",
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtube-nocookie.com",
      "youtube-nocookie.com",
    ];

    if (!validHosts.includes(host)) {
      return null;
    }

    let videoId: string | null = null;

    if (host === "youtu.be") {
      // Path format: /VIDEO_ID
      const segments = parsed.pathname.split("/").filter(Boolean);
      videoId = segments[0] || null;
    } else if (parsed.pathname.startsWith("/embed/")) {
      // Path format: /embed/VIDEO_ID
      const segments = parsed.pathname.slice("/embed/".length).split("/").filter(Boolean);
      videoId = segments[0] || null;
    } else if (parsed.pathname === "/watch") {
      // Query param format: ?v=VIDEO_ID
      videoId = parsed.searchParams.get("v");
    }

    if (!videoId) return null;

    // Remove any trailing parameters or fragment if present
    videoId = videoId.split("&")[0].split("?")[0].split("#")[0].trim();

    // Standard YouTube video IDs are 11 alphanumeric and underscore/hyphen characters
    if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Constructs an approved secure YouTube embed URL with autoplay and privacy options.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: { autoplay?: boolean } = { autoplay: true }
): string {
  const autoplayParam = options.autoplay !== false ? "1" : "0";
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplayParam}&rel=0&modestbranding=1&enablejsapi=1`;
}

/**
 * Parses movie_trailers.csv text into a Map keyed by normalized string TMDB Movie_ID.
 * Handles quoted movie names containing commas (e.g. 2048,"I, Robot",https://...).
 */
export function parseMovieTrailersCsv(csvText: string): Map<string, MovieTrailerRecord> {
  const map = new Map<string, MovieTrailerRecord>();
  if (!csvText || typeof csvText !== "string") return map;

  const lines = csvText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Check if header line
    if (i === 0 && line.toLowerCase().includes("movie_id")) continue;

    // Movie_ID is first column (digits), Trailer_Link is last column.
    // Movie title may be quoted or contain commas.
    const firstComma = line.indexOf(",");
    const lastComma = line.lastIndexOf(",");
    if (firstComma === -1 || lastComma === -1 || firstComma === lastComma) {
      continue;
    }

    const rawId = line.substring(0, firstComma).trim();
    const rawLink = line.substring(lastComma + 1).trim();
    const rawName = line
      .substring(firstComma + 1, lastComma)
      .trim()
      .replace(/^"|"$/g, "")
      .trim();

    const numericId = parseInt(rawId, 10);
    if (isNaN(numericId) || numericId <= 0) continue;

    const normalizedKey = String(numericId);
    const videoId = extractYouTubeVideoId(rawLink);
    const isAvailable = Boolean(videoId);
    const embedUrl = videoId ? buildYouTubeEmbedUrl(videoId, { autoplay: true }) : null;

    map.set(normalizedKey, {
      movieId: numericId,
      movieName: rawName,
      trailerLink: rawLink,
      videoId,
      embedUrl,
      isAvailable,
    });
  }

  return map;
}

// In-memory singleton cached trailer map (parsed once)
let cachedTrailersMap: Map<string, MovieTrailerRecord> | null = null;

function getCachedTrailersMap(): Map<string, MovieTrailerRecord> {
  if (!cachedTrailersMap) {
    cachedTrailersMap = parseMovieTrailersCsv(rawTrailerCsv);
  }
  return cachedTrailersMap;
}

/**
 * Resolves a movie's trailer record by its TMDB movie ID (string or number).
 * Returns null if the movie has no trailer, has NOT FOUND, or has an invalid link.
 */
export function getMovieTrailer(
  movieId: string | number | null | undefined
): MovieTrailerRecord | null {
  if (movieId == null) return null;

  const str = String(movieId).trim();
  if (!str) return null;

  const numericId = parseInt(str, 10);
  if (isNaN(numericId) || numericId <= 0) return null;

  const trailers = getCachedTrailersMap();
  const record = trailers.get(String(numericId));

  if (!record || !record.isAvailable) {
    return null;
  }

  return record;
}

/**
 * Returns raw record (even if unavailable) for diagnostic or UI messaging.
 */
export function getMovieTrailerRecord(
  movieId: string | number | null | undefined
): MovieTrailerRecord | null {
  if (movieId == null) return null;

  const str = String(movieId).trim();
  if (!str) return null;

  const numericId = parseInt(str, 10);
  if (isNaN(numericId) || numericId <= 0) return null;

  const trailers = getCachedTrailersMap();
  return trailers.get(String(numericId)) || null;
}
