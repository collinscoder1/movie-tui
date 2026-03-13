import { getDownloadLinks, getSubjectDetail, searchSubjects } from '../../../moviebox/index.js';
import type { SearchOptions, MovieboxSearchResult } from '../../../moviebox/index.js';
import type {
  MovieboxDownloadEntry,
  MovieboxDownloadResult,
  MovieboxSeason,
  MovieboxSubjectDetail,
  MovieboxSubjectType,
  MovieboxSubtitleEntry,
  SubjectSummary
} from '../../../moviebox/types.js';
import type { EpisodeDescriptor, SearchResult } from '../../../search.js';
import type { ExtractionResult, DownloadEntry } from '../../../extractor.js';
import type {
  MediaSource,
  MediaSourceOptions,
  MediaType,
  SourceEpisode,
  SourceMediaInfo
} from '../../types.js';

export interface MovieboxSourceClient {
  searchSubjects(options: SearchOptions): Promise<MovieboxSearchResult>;
  getSubjectDetail(detailPath: string, options?: Parameters<typeof getSubjectDetail>[1]): Promise<MovieboxSubjectDetail>;
  getDownloadLinks(
    subjectId: string,
    season: number,
    episode: number,
    detailPath: string,
    options?: Parameters<typeof getDownloadLinks>[4]
  ): Promise<MovieboxDownloadResult>;
}

const subjectTypeMap: Record<MediaType, MovieboxSubjectType> = {
  movie: 1,
  tv: 2
};

const MOVIEBOX_DOWNLOAD_HEADERS: Record<string, string> = {
  referer: 'https://downloader2.com/',
  origin: 'https://downloader2.com'
};

function parseReleaseYear(value?: string): string {
  if (!value) return 'unknown';
  const match = value.split('-')[0];
  return match || 'unknown';
}

function seasonToEpisodes(season: { episodes: Array<{ episode: number; title?: string }> }): SourceEpisode[] {
  return season.episodes.map(ep => ({
    episode_number: ep.episode,
    name: ep.title
  }));
}

function detailToSourceMedia(detail: MovieboxSubjectDetail): SourceMediaInfo {
  // Use metadata title if available (clean title without season range)
  const cleanTitle = (detail.metadata?.title as string) ?? detail.title;
  const metadata = {
    subjectId: detail.subjectId,
    detailPath: detail.detailPath,
    releaseDate: detail.releaseDate,
    title: cleanTitle
  };
  if (detail.type === 'tv' || detail.type === 'anime') {
    const firstSeason = detail.seasons[0];
    return {
      type: 'tv',
      tmdbId: detail.detailPath,
      title: cleanTitle,
      seasonNumber: firstSeason?.seasonNumber ?? 1,
      episodes: firstSeason ? seasonToEpisodes(firstSeason) : [],
      metadata
    };
  }
  return {
    type: 'movie',
    tmdbId: detail.detailPath,
    title: cleanTitle,
    metadata
  };
}

function formatBytes(bytes: number | string | undefined): string {
  if (bytes === undefined || bytes === null) return 'Unknown';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num === 0) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = num;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')} ${units[unitIndex]}`;
}

function groupDownloads(entries: DownloadEntry[]) {
  return entries.reduce<Record<string, DownloadEntry[]>>((acc, entry) => {
    const bucket = entry.format || 'Other';
    if (!acc[bucket]) {
      acc[bucket] = [];
    }
    acc[bucket].push(entry);
    return acc;
  }, {});
}

function movieboxDownloadResultToExtraction(
  descriptor: EpisodeDescriptor,
  result: MovieboxDownloadResult
): ExtractionResult {
  const episodeTitle = descriptor.metadata?.episodeTitle ?? `Episode ${descriptor.episode ?? 0}`;
  const releaseDate = String(descriptor.metadata?.releaseDate ?? 'Unknown');
  const year = parseReleaseYear(releaseDate);
  // Use clean title from metadata if available
  const cleanTitle = (descriptor.metadata?.title as string) ?? descriptor.title;
  const metadata = descriptor.type === 'movie'
    ? { title: cleanTitle, year }
    : { title: cleanTitle, year, episodeTitle, releaseDate };
  const downloads: DownloadEntry[] = result.downloads.map((entry: MovieboxDownloadEntry) => ({
    format: entry.format,
    resolution: entry.resolution ?? null,
    size: formatBytes(entry.size),
    url: entry.url,
    headers: MOVIEBOX_DOWNLOAD_HEADERS
  }));
  const subtitles = result.subtitles.map((subtitle: MovieboxSubtitleEntry) => ({
    lanName: subtitle.lanName,
    size: formatBytes(subtitle.size),
    url: subtitle.url,
    headers: MOVIEBOX_DOWNLOAD_HEADERS
  }));
  return {
    type: descriptor.type,
    tmdbId: descriptor.tmdbId,
    metadata,
    friendlyName: descriptor.type === 'movie'
      ? `${cleanTitle} (${year})`
      : `${cleanTitle} S${descriptor.season ?? 0}E${descriptor.episode ?? 0}`,
    downloads: groupDownloads(downloads),
    subtitles,
    downloadPage: 'https://downloader2.com/'
  };
}

function buildShowDetails(detail: MovieboxSubjectDetail) {
  // Use metadata title if available (clean title without season range like "S1-S6")
  const cleanTitle = (detail.metadata?.title as string) ?? detail.title;
  return {
    name: cleanTitle,
    seasons: detail.seasons.map((season: MovieboxSeason) => ({
      season_number: season.seasonNumber,
      episode_count: season.episodes.length
    }))
  };
}

// Default client implementation
const defaultClient: MovieboxSourceClient = {
  searchSubjects,
  getSubjectDetail,
  getDownloadLinks
};

export class MovieboxMediaSource implements MediaSource {
  constructor(private client: MovieboxSourceClient = defaultClient) {}

  async searchByName(type: MediaType, query: string): Promise<SearchResult[]> {
    const subjectType = subjectTypeMap[type];
    const payload = await this.client.searchSubjects({ keyword: query, subjectType });
    return payload.items.map((item: SubjectSummary) => ({
      tmdbId: item.detailPath,
      title: item.title,
      year: parseReleaseYear(item.releaseDate),
      metadata: {
        subjectId: item.subjectId,
        detailPath: item.detailPath,
        releaseDate: item.releaseDate
      }
    }));
  }

  async describeFromUrl(): Promise<never> {
    throw new Error('Moviebox URLs are not supported yet');
  }

  async describeFromTmdb(type: MediaType, tmdbId: string): Promise<SourceMediaInfo> {
    const detail = await this.client.getSubjectDetail(tmdbId);
    return detailToSourceMedia(detail);
  }

  async fetchSeasonEpisodes(tmdbId: string, season: number): Promise<SourceEpisode[]> {
    const detail = await this.client.getSubjectDetail(tmdbId);
    const matched = detail.seasons.find((s: MovieboxSeason) => s.seasonNumber === season);
    return matched ? seasonToEpisodes(matched) : [];
  }

  async fetchShowDetails(tmdbId: string): Promise<{ name: string; seasons: Array<{ season_number: number; episode_count?: number }> }> {
    const detail = await this.client.getSubjectDetail(tmdbId);
    return buildShowDetails(detail);
  }

  async fetchMovieMetadata(tmdbId: string): Promise<{ title: string }> {
    const detail = await this.client.getSubjectDetail(tmdbId);
    const cleanTitle = (detail.metadata?.title as string) ?? detail.title;
    return { title: cleanTitle };
  }

  async fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions): Promise<ExtractionResult> {
    const { metadata } = descriptor;
    const detailPath = typeof metadata?.detailPath === 'string' ? metadata.detailPath : descriptor.tmdbId;
    const subjectId = typeof metadata?.subjectId === 'string'
      ? metadata.subjectId
      : (await this.client.getSubjectDetail(detailPath)).subjectId;
    const season = descriptor.type === 'movie' ? 0 : descriptor.season ?? 1;
    const episode = descriptor.type === 'movie' ? 0 : descriptor.episode ?? 1;
    const downloads = await this.client.getDownloadLinks(subjectId, season, episode, detailPath, options);
    return movieboxDownloadResultToExtraction(descriptor, downloads);
  }
}

// Backward compatibility - factory function
export function createMovieboxSource(client?: MovieboxSourceClient): MediaSource {
  return new MovieboxMediaSource(client);
}
