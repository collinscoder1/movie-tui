import type { EpisodeDescriptor, SearchResult } from '../search.js';
import type { ExtractionResult } from '../extractor.js';
import type {
  MediaSource,
  MediaSourceOptions,
  MediaType,
  SourceEpisode,
  SourceMediaInfo,
  UrlMediaInfo
} from './types.js';

export type SourceKey = string;

export class SourceService {
  private providers = new Map<SourceKey, MediaSource>();
  private activeKey: SourceKey;

  constructor(defaultKey: SourceKey) {
    this.activeKey = defaultKey;
  }

  registerSource(key: SourceKey, source: MediaSource): void {
    this.providers.set(key, source);
  }

  getAvailableSources(): SourceKey[] {
    return Array.from(this.providers.keys());
  }

  useSource(key: SourceKey): void {
    if (!this.providers.has(key)) {
      throw new Error(`Media source not registered: ${key}`);
    }
    this.activeKey = key;
  }

  describeFromUrl(url: string, key?: SourceKey): Promise<UrlMediaInfo> {
    return this.resolveSource(key).describeFromUrl(url);
  }

  searchByName(type: MediaType, query: string, key?: SourceKey): Promise<SearchResult[]> {
    return this.resolveSource(key).searchByName(type, query);
  }

  describeFromTmdb(type: MediaType, tmdbId: string, key?: SourceKey): Promise<SourceMediaInfo> {
    return this.resolveSource(key).describeFromTmdb(type, tmdbId);
  }

  fetchSeasonEpisodes(tmdbId: string, season: number, key?: SourceKey): Promise<SourceEpisode[]> {
    return this.resolveSource(key).fetchSeasonEpisodes(tmdbId, season);
  }

  fetchShowDetails(tmdbId: string, key?: SourceKey): Promise<{ name: string; seasons: Array<{ season_number: number; episode_count?: number }> }> {
    return this.resolveSource(key).fetchShowDetails(tmdbId);
  }

  fetchMovieMetadata(tmdbId: string, key?: SourceKey): Promise<{ title: string }> {
    return this.resolveSource(key).fetchMovieMetadata(tmdbId);
  }

  fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions, key?: SourceKey): Promise<ExtractionResult> {
    return this.resolveSource(key).fetchDownloads(descriptor, options);
  }

  private resolveSource(key?: SourceKey): MediaSource {
    const lookup = key ?? this.activeKey;
    const source = this.providers.get(lookup);
    if (!source) {
      throw new Error(`No media source registered under "${lookup}"`);
    }
    return source;
  }
}
