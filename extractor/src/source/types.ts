import type { SupabaseClient } from '@supabase/supabase-js';

export type MediaType = 'movie' | 'tv';

export interface SourceEpisode {
  episode_number: number;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface SourceTvSeasonInfo {
  type: 'tv';
  tmdbId: string;
  title: string;
  seasonNumber: number;
  episodes: SourceEpisode[];
  metadata?: Record<string, unknown>;
}

export interface SourceMovieInfo {
  type: 'movie';
  tmdbId: string;
  title: string;
  metadata?: Record<string, unknown>;
}

export type SourceMediaInfo = SourceTvSeasonInfo | SourceMovieInfo;

export type UrlMediaInfo = SourceMediaInfo & {
  season?: number | null;
  episode?: number | null;
  url: string;
  metadata?: Record<string, unknown>;
};

export interface MediaSourceOptions {
  fetchImpl?: typeof fetch;
  supabaseClient?: SupabaseClient;
  signal?: AbortSignal;
}

export interface ShowDetailsResult {
  name: string;
  seasons: Array<{ season_number: number; episode_count?: number }>;
  metadata?: Record<string, unknown>;
}

// EpisodeDescriptor - used to describe what to download
export interface EpisodeDescriptor {
  type: MediaType;
  tmdbId: string;
  season: number | null;
  episode: number | null;
  description: string;
  title: string;
  metadata?: Record<string, unknown>;
}

// SearchResult - result from searching by name
export interface SearchResult {
  tmdbId: string;
  title: string;
  year: string;
  metadata?: Record<string, unknown>;
}

// DownloadEntry - a single download option
export interface DownloadEntry {
  resolution: string | null;
  format: string;
  size: string;
  url: string;
  headers?: Record<string, string>;
}

// SubtitleEntry - a single subtitle option
export interface SubtitleEntry {
  lanName: string;
  size: string;
  url: string;
  headers?: Record<string, string>;
}

// ExtractionResult - result from fetching download links
export interface ExtractionResult {
  type: MediaType;
  tmdbId: string;
  metadata: { title: string; year: string; episodeTitle?: string; releaseDate?: string };
  friendlyName: string;
  downloads: Record<string, DownloadEntry[]>;
  subtitles: SubtitleEntry[];
  downloadPage: string;
}

// MediaSource interface - implemented by all providers
export interface MediaSource {
  searchByName(type: MediaType, query: string): Promise<SearchResult[]>;
  describeFromUrl(url: string): Promise<UrlMediaInfo>;
  describeFromTmdb(type: MediaType, tmdbId: string): Promise<SourceMediaInfo>;
  fetchSeasonEpisodes(tmdbId: string, season: number): Promise<SourceEpisode[]>;
  fetchShowDetails(tmdbId: string): Promise<ShowDetailsResult>;
  fetchMovieMetadata(tmdbId: string): Promise<{ title: string }>;
  fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions): Promise<ExtractionResult>;
}
