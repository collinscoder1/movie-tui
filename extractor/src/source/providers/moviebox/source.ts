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
  const metadata = {
    subjectId: detail.subjectId,
    detailPath: detail.detailPath,
    releaseDate: detail.releaseDate
  };
  if (detail.type === 'tv' || detail.type === 'anime') {
    const firstSeason = detail.seasons[0];
    return {
      type: 'tv',
      tmdbId: detail.detailPath,
      title: detail.title,
      seasonNumber: firstSeason?.seasonNumber ?? 1,
      episodes: firstSeason ? seasonToEpisodes(firstSeason) : [],
      metadata
    };
  }
  return {
    type: 'movie',
    tmdbId: detail.detailPath,
    title: detail.title,
    metadata
  };
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
  const metadata = descriptor.type === 'movie'
    ? { title: descriptor.title, year }
    : { title: descriptor.title, year, episodeTitle, releaseDate };
  const downloads: DownloadEntry[] = result.downloads.map((entry: MovieboxDownloadEntry) => ({
    format: entry.format,
    resolution: entry.resolution ?? null,
    size: entry.size ?? 'Unknown',
    url: entry.url
  }));
  const subtitles = result.subtitles.map((subtitle: MovieboxSubtitleEntry) => ({
    lanName: subtitle.lanName,
    size: subtitle.size ?? 'Unknown',
    url: subtitle.url
  }));
  return {
    type: descriptor.type,
    tmdbId: descriptor.tmdbId,
    metadata,
    friendlyName: descriptor.type === 'movie'
      ? `${descriptor.title} (${year})`
      : `${descriptor.title} S${descriptor.season ?? 0}E${descriptor.episode ?? 0}`,
    downloads: groupDownloads(downloads),
    subtitles
  };
}

function buildShowDetails(detail: MovieboxSubjectDetail) {
  return {
    name: detail.title,
    seasons: detail.seasons.map((season: MovieboxSeason) => ({
      season_number: season.seasonNumber,
      episode_count: season.episodes.length
    }))
  };
}

export function createMovieboxSource(client: MovieboxSourceClient = { searchSubjects, getSubjectDetail, getDownloadLinks }): MediaSource {
  return {
    searchByName: (type, query) => {
      const subjectType = subjectTypeMap[type];
      return client.searchSubjects({ keyword: query, subjectType }).then((payload) =>
        payload.items.map((item: SubjectSummary) => ({
          tmdbId: item.detailPath,
          title: item.title,
          year: parseReleaseYear(item.releaseDate),
          metadata: {
            subjectId: item.subjectId,
            detailPath: item.detailPath,
            releaseDate: item.releaseDate
          }
        }))
      );
    },
    describeFromUrl: () => {
      throw new Error('Moviebox URLs are not supported yet');
    },
    describeFromTmdb: async (type, tmdbId) => {
      const detail = await client.getSubjectDetail(tmdbId);
      return detailToSourceMedia(detail);
    },
    fetchSeasonEpisodes: async (tmdbId, season) => {
      const detail = await client.getSubjectDetail(tmdbId);
      const matched = detail.seasons.find((s: MovieboxSeason) => s.seasonNumber === season);
      return matched ? seasonToEpisodes(matched) : [];
    },
    fetchShowDetails: async (tmdbId) => {
      const detail = await client.getSubjectDetail(tmdbId);
      return buildShowDetails(detail);
    },
    fetchMovieMetadata: async (tmdbId) => {
      const detail = await client.getSubjectDetail(tmdbId);
      return { title: detail.title };
    },
    fetchDownloads: async (descriptor, options) => {
      const { metadata } = descriptor;
      const detailPath = typeof metadata?.detailPath === 'string' ? metadata.detailPath : descriptor.tmdbId;
      const subjectId = typeof metadata?.subjectId === 'string'
        ? metadata.subjectId
        : (await client.getSubjectDetail(detailPath)).subjectId;
      const season = descriptor.type === 'movie' ? 1 : descriptor.season ?? 1;
      const episode = descriptor.type === 'movie' ? 1 : descriptor.episode ?? 1;
      const downloads = await client.getDownloadLinks(subjectId, season, episode, detailPath, options);
      return movieboxDownloadResultToExtraction(descriptor, downloads);
    }
  };
}
