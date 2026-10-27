/**
 * MOVIEAI Centralized Typed API Client
 *
 * Connects frontend discovery & explore experiences to the local FastAPI recommendation engine.
 */

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  created_at?: string;
  last_login_at?: string | null;
}

export interface AuthResponse {
  token: string;
  user_id: string;
  name: string;
  email: string;
  token_type: string;
}

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

export interface ApiReviewItem {
  review_id: string;
  movie_id: number;
  user_id: string;
  author: string;
  handle: string;
  avatar: string;
  rating: number;
  sentiment: "skip" | "timepass" | "goforit" | "perfection";
  content: string;
  is_spoiler: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user_liked?: boolean;
  is_own_review?: boolean;
}

export interface ApiReviewListResponse {
  movie_id: number;
  total: number;
  reviews: ApiReviewItem[];
  limit?: number;
  offset?: number;
}

export interface ApiReviewSummaryResponse {
  movie_id: number;
  total_votes: number;
  positive_votes: number;
  consensus_pct: number;
  average_rating: number;
  distribution: Record<"skip" | "timepass" | "goforit" | "perfection", number>;
  vote_counts: Record<"skip" | "timepass" | "goforit" | "perfection", number>;
  rating_counts: Record<string, number>;
  rating_distribution: Record<string, number>;
  // Backward and forward compatibility aliases
  total_reviews?: number;
  positive_reviews?: number;
  sentiment_percentages?: Record<"skip" | "timepass" | "goforit" | "perfection", number>;
  sentiment_distribution?: Record<"skip" | "timepass" | "goforit" | "perfection", number>;
}

export type MovieReviewItem = ApiReviewItem;
export type MovieReviewListResponse = ApiReviewListResponse;
export type MovieReviewSummary = ApiReviewSummaryResponse;

export interface ReviewCreatePayload {
  rating: number;
  sentiment: "skip" | "timepass" | "goforit" | "perfection";
  content: string;
  is_spoiler?: boolean;
}

export interface ReviewUpdatePayload {
  rating?: number;
  sentiment?: "skip" | "timepass" | "goforit" | "perfection";
  content?: string;
  is_spoiler?: boolean;
}

export interface ReviewLikeResult {
  status: string;
  review_id: string;
  active: boolean;
  likes_count: number;
  liked?: boolean;
}

// Fallback to local FastAPI recommendation engine
const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta.env?.["VITE_API_URL"] as string | undefined)) ||
  "http://127.0.0.1:8000";

const AUTH_TOKEN_KEY = "movieai_auth_token_v1";
const AUTH_USER_KEY = "movieai_auth_user_v1";

export type AuthEvent = "unauthorized" | "logged_out" | "logged_in";
type AuthStateListener = (event: AuthEvent) => void;
const authListeners = new Set<AuthStateListener>();

export function onAuthEvent(listener: AuthStateListener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function notifyAuth(event: AuthEvent) {
  authListeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      // ignore listener error
    }
  });
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string | null, user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export class ApiError extends Error {
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
  userId?: string,
  timeoutMs: number = 8000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const storedUser = getStoredUser();
  const effectiveUserId = userId || storedUser?.user_id;
  if (effectiveUserId && !headers.has("X-User-Id")) {
    headers.set("X-User-Id", effectiveUserId);
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

      // If an authenticated request (bearing token) was rejected with 401,
      // session is expired or invalid on the backend: invalidate stored token.
      if (response.status === 401 && headers.has("Authorization")) {
        setStoredAuth(null, null);
        notifyAuth("unauthorized");
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

  getStoredToken,
  getStoredUser,
  setStoredAuth,
  onAuthEvent,
  isAuthenticated(): boolean {
    return Boolean(getStoredToken());
  },

  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setStoredAuth(res.token, {
      user_id: res.user_id,
      name: res.name,
      email: res.email,
    });
    notifyAuth("logged_in");
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setStoredAuth(res.token, {
      user_id: res.user_id,
      name: res.name,
      email: res.email,
    });
    notifyAuth("logged_in");
    return res;
  },

  async logout(): Promise<void> {
    const token = getStoredToken();
    try {
      if (token) {
        await apiRequest<{ status: string }>("/auth/logout", { method: "POST" });
      }
    } catch {
      // ignore
    } finally {
      setStoredAuth(null, null);
      notifyAuth("logged_out");
    }
  },

  async getMe(): Promise<AuthUser> {
    return apiRequest<AuthUser>("/auth/me", { method: "GET" });
  },

  async checkHealth(): Promise<HealthResponse> {
    return apiRequest<HealthResponse>("/health", { method: "GET" }, undefined, 3000);
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

  async fetchProfile(userId?: string): Promise<UserProfileState> {
    if (!userId && !getStoredToken()) {
      throw new ApiError(401, "No active session for fetchProfile.");
    }
    return apiRequest<UserProfileState>("/profile", { method: "GET" }, userId);
  },

  async updateProfile(
    data: {
      name?: string;
      email?: string;
      favorite_genres?: string[];
      preferred_languages?: string[];
    },
    userId?: string
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

  async toggleLike(movieId: number | string, userId?: string): Promise<InteractionResponse> {
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

  async toggleDislike(movieId: number | string, userId?: string): Promise<InteractionResponse> {
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

  async toggleFavorite(movieId: number | string, userId?: string): Promise<InteractionResponse> {
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

  async toggleWatchlist(movieId: number | string, userId?: string): Promise<InteractionResponse> {
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

  async recordWatched(movieId: number | string, userId?: string): Promise<InteractionResponse> {
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

  async rateMovie(movieId: number | string, rating: number, userId?: string): Promise<InteractionResponse> {
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

  async resetProfile(userId?: string): Promise<ResetResponse> {
    if (!userId && !getStoredToken()) {
      throw new ApiError(401, "No active session for resetProfile.");
    }
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

  async getMovieReviews(
    movieId: number | string,
    sort: string = "newest",
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiReviewListResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<ApiReviewListResponse>(
      `/movies/${cleanId}/reviews?sort=${sort}&limit=${limit}&offset=${offset}`,
      { method: "GET" }
    );
  },

  async getMovieReviewSummary(movieId: number | string): Promise<ApiReviewSummaryResponse> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<ApiReviewSummaryResponse>(`/movies/${cleanId}/reviews/summary`, {
      method: "GET",
    });
  },

  async getMyMovieReview(movieId: number | string): Promise<ApiReviewItem | null> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    try {
      return await apiRequest<ApiReviewItem>(`/movies/${cleanId}/reviews/me`, { method: "GET" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async createMovieReview(
    movieId: number | string,
    data: ReviewCreatePayload
  ): Promise<ApiReviewItem> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<ApiReviewItem>(`/movies/${cleanId}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMovieReview(
    movieId: number | string,
    reviewId: string,
    data: ReviewUpdatePayload
  ): Promise<ApiReviewItem> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<ApiReviewItem>(`/movies/${cleanId}/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteMovieReview(movieId: number | string, reviewId: string): Promise<void> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    await apiRequest<{ status: string }>(`/movies/${cleanId}/reviews/${reviewId}`, {
      method: "DELETE",
    });
  },

  async toggleReviewLike(
    movieId: number | string,
    reviewId: string
  ): Promise<ReviewLikeResult> {
    const cleanId = typeof movieId === "string" ? parseInt(movieId, 10) : movieId;
    return apiRequest<ReviewLikeResult>(`/movies/${cleanId}/reviews/${reviewId}/like`, {
      method: "POST",
    });
  },
};
