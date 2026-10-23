export type RatingCategory = "skip" | "timepass" | "goforit" | "perfection";

export interface RatingCategoryMeta {
  id: RatingCategory;
  label: string;
  colorClass: string;
  bgClass: string;
  hex: string;
  description: string;
}

export interface CastMember {
  id: string;
  name: string;
  character: string;
  avatarUrl?: string | null;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

export interface VibeItem {
  label: string;
  value: number; // percentage (0-100)
  color: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  itemCount: number;
  likeCount: number;
  posters: string[];
}

export interface UserReview {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  date: string;
  rating: RatingCategory;
  content: string;
  likes: number;
  replies: number;
  spoiler?: boolean;
  following?: boolean;
  userLiked?: boolean;
}

export interface MovieMeterData {
  consensusPct: number;
  positiveVotes: number;
  totalVotes: number;
  distribution: Record<RatingCategory, number>; // percentages 0-100
  voteCounts: Record<RatingCategory, number>;
}

export interface MovieDetail {
  id: string;
  title: string;
  year: number | null;
  runtime: number | null; // in minutes
  runtimeFormatted: string;
  rating: number | null; // 0-10
  voteCount: number;
  popularity: number;
  genre: string;
  genres: string[];
  director: string;
  studio: string | null;
  country: string | null;
  language: string | null;
  ageRating: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  budget: number | null;
  revenue: number | null;
  trailerUrl: string | null;
  hasPoster: boolean;
}
