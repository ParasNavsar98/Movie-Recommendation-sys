/**
 * MOVIEAI Centralized Typed API Client
 *
 * Connects frontend discovery & explore experiences to the local FastAPI recommendation engine.
 */

export interface RecommendationItem {
  Movie_ID: number;
  Title: string;
  Release_Year: number | null;
  Genres: string | null;
  Director: string | null;
  Vote_Average: number | null;
  Poster_Web_Path: string | null;
  poster_path: string | null;
  Similarity_Score: number;
  Score_Components: Record<string, number>;
  Ranking_Components?: Record<string, number>;
  Recommendation_Reasons: string[];
}

export interface RecommendationResponse {
  mode: string;
  seed_movie_id: number | null;
  count: number;
  fallback_reason: string | null;
  warnings: string[];
  excluded_count: number;
  results: RecommendationItem[];
}

export interface HealthResponse {
  status: string;
  ready: boolean;
  movies: number;
  feature_source?: string;
  plot_vocabulary_size?: number;
  dataset_sha256?: string;
  missing_descriptions?: number;
  missing_genres?: number;
}

export interface UserProfileState {
  user_id: string;
  name: string;
  email: string;
  likes: number[];
  dislikes: number[];
  favorites: number[];
  watchlist: number[];
  watched: number[];
  history: number[];
  ratings: Record<string, number>;
  favorite_genres: string[];
  preferred_languages: string[];
}

export interface InteractionResponse {
  status: string;
  movie_id: number;
  interaction_type: string;
  active: boolean;
  message?: string;
}

export interface ResetResponse {
  status: string;
  user_id: string;
  message: string;
}

export interface SearchCandidate {
  Movie_ID: number;
  Title: string;
  Release_Year: number | null;
  Genres: string | null;
  Poster_Web_Path: string | null;
  poster_path: string | null;
  Match_Type: string;
}

export interface SearchResponse {
  query: string;
  auto_resolved: boolean;
  resolved_movie_id: number | null;
  results: SearchCandidate[];
}

export interface ApiMovieDetail {
  Movie_ID: number;
  Title: string;
  Release_Year: number | null;
  Genres: string | null;
  Poster_Web_Path: string | null;
  poster_path: string | null;
  Language: string | null;
  Director: string | null;
  Vote_Average: number | null;
  Vote_Count: number | null;
  Popularity: number | null;
  Runtime_Min: number | null;
  Movie_Description: string | null;
}

// Fallback to local FastAPI recommendation engine
const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://127.0.0.1:8000";

const DEFAULT_USER_ID = "movieai_local_user";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  userId: string = DEFAULT_USER_ID,
  timeoutMs: number = 8000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("X-User-Id")) {
    headers.set("X-User-Id", userId);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `API error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          detail = typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // fallback to text
      }
      throw new ApiError(response.status, detail);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(504, `Request to ${endpoint} timed out after ${timeoutMs}ms`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiError(503, `Cannot connect to recommendation backend at ${API_BASE_URL}: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

export const movieAiApi = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  async checkHealth(): Promise<HealthResponse> {
    return apiRequest<HealthResponse>("/health", { method: "GET" }, DEFAULT_USER_ID, 3000);
  },

  async fetchFeed(options: {
    limit?: number;
    mode?: string;
    genre?: string;
    diversityLambda?: number;
    excludeWatched?: boolean;
    userId?: string;
  } = {}): Promise<RecommendationResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.mode) params.set("mode", options.mode);
    if (options.genre && options.genre !== "All Movies") params.set("genre", options.genre);
    if (typeof options.diversityLambda === "number") params.set("diversity_lambda", String(options.diversityLambda));
    if (typeof options.excludeWatched === "boolean") params.set("exclude_watched", String(options.excludeWatched));

    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<RecommendationResponse>(`/recommendations/feed${qs}`, { method: "GET" }, options.userId);
  },

  async fetchSimilar(
    movieId: number | string,
    limit: number = 10,
    diversityLambda: number = 1.0,
    userId?: string
  ): Promise<RecommendationResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<RecommendationResponse>(
      `/recommendations/movie/${cleanId}?limit=${limit}&diversity_lambda=${diversityLambda}`,
      { method: "GET" },
      userId
    );
  },

  async fetchProfile(userId: string = DEFAULT_USER_ID): Promise<UserProfileState> {
    return apiRequest<UserProfileState>("/profile", { method: "GET" }, userId);
  },

  async updateProfile(
    data: {
      name?: string;
      email?: string;
      favorite_genres?: string[];
      preferred_languages?: string[];
    },
    userId: string = DEFAULT_USER_ID
  ): Promise<UserProfileState> {
    return apiRequest<UserProfileState>(
      "/profile",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      userId
    );
  },

  async toggleLike(movieId: number | string, userId: string = DEFAULT_USER_ID): Promise<InteractionResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<InteractionResponse>(
      "/interactions/like",
      {
        method: "POST",
        body: JSON.stringify({ movie_id: cleanId }),
      },
      userId
    );
  },

  async toggleDislike(movieId: number | string, userId: string = DEFAULT_USER_ID): Promise<InteractionResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<InteractionResponse>(
      "/interactions/dislike",
      {
        method: "POST",
        body: JSON.stringify({ movie_id: cleanId }),
      },
      userId
    );
  },

  async toggleFavorite(movieId: number | string, userId: string = DEFAULT_USER_ID): Promise<InteractionResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<InteractionResponse>(
      "/interactions/favorite",
      {
        method: "POST",
        body: JSON.stringify({ movie_id: cleanId }),
      },
      userId
    );
  },

  async toggleWatchlist(movieId: number | string, userId: string = DEFAULT_USER_ID): Promise<InteractionResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<InteractionResponse>(
      "/interactions/watchlist",
      {
        method: "POST",
        body: JSON.stringify({ movie_id: cleanId }),
      },
      userId
    );
  },

  async recordWatched(movieId: number | string, userId: string = DEFAULT_USER_ID): Promise<InteractionResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<InteractionResponse>(
      "/interactions/watched",
      {
        method: "POST",
        body: JSON.stringify({ movie_id: cleanId }),
      },
      userId
    );
  },

  async rateMovie(movieId: number | string, rating: number, userId: string = DEFAULT_USER_ID): Promise<InteractionResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<InteractionResponse>(
      "/interactions/rate",
      {
        method: "POST",
        body: JSON.stringify({ movie_id: cleanId, rating }),
      },
      userId
    );
  },

  async resetProfile(userId: string = DEFAULT_USER_ID): Promise<ResetResponse> {
    return apiRequest<ResetResponse>(
      "/profile/reset",
      {
        method: "POST",
      },
      userId
    );
  },

  async searchMovies(query: string, limit: number = 10): Promise<SearchResponse> {
    return apiRequest<SearchResponse>(
      `/movies/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { method: "GET" }
    );
  },

  async getMovieDetail(movieId: number | string): Promise<ApiMovieDetail> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<ApiMovieDetail>(`/movies/${cleanId}`, { method: "GET" });
  },
};
