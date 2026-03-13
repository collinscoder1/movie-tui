import type { EpisodeDescriptor, SearchResult } from '../search.js';
import type { ExtractionResult, DownloadEntry } from '../extractor.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MediaType = 'movie' | 'tv';

export interface SourceEpisode {
  episode_number: number;
  name?: string;
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

export interface MediaSource {
  searchByName(type: MediaType, query: string): Promise<SearchResult[]>;
  describeFromUrl(url: string): Promise<UrlMediaInfo>;
  describeFromTmdb(type: MediaType, tmdbId: string): Promise<SourceMediaInfo>;
  fetchSeasonEpisodes(tmdbId: string, season: number): Promise<SourceEpisode[]>;
  fetchShowDetails(tmdbId: string): Promise<{ name: string; seasons: Array<{ season_number: number; episode_count?: number }> }>;
  fetchMovieMetadata(tmdbId: string): Promise<{ title: string }>;
  fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions): Promise<ExtractionResult>;
}

export type { EpisodeDescriptor, SearchResult, ExtractionResult, DownloadEntry };
