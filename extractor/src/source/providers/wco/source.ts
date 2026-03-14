import type { EpisodeDescriptor, SearchResult } from '../../../search.js';
import type { ExtractionResult, DownloadEntry } from '../../../extractor.js';
import type { MediaSource, MediaSourceOptions, MediaType, SourceEpisode, SourceMediaInfo, SourceTvSeasonInfo, UrlMediaInfo, ShowDetailsResult } from '../../types.js';
import { getSeriesDetail, getVideoInfo, searchSeries } from '../../../wco/index.js';
import type { WcoSeriesDetail, WcoSeriesSummary, WcoVideoInfo } from '../../../wco/types.js';
import { cfFetch } from '../../../wco/curl-fetch.js';

interface EpisodeMetadata {
  season: number;
  episode: number;
  url: string;
  title: string;
}

export interface WcoSeasonMetadata {
  detailUrl: string;
  episodes: EpisodeMetadata[];
}

export interface WcoSourceClient {
  searchSeries(keyword: string, options?: Parameters<typeof searchSeries>[1]): Promise<WcoSeriesSummary[]>;
  getSeriesDetail(seriesUrl: string, options?: Parameters<typeof getSeriesDetail>[1]): Promise<WcoSeriesDetail>;
  getVideoInfo(episodeUrl: string, options?: Parameters<typeof getVideoInfo>[1]): Promise<WcoVideoInfo>;
}

const defaultClient: WcoSourceClient = {
  searchSeries,
  getSeriesDetail,
  getVideoInfo
};

const WCO_BASE_URL = 'https://www.wcoflix.tv';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

const WCO_DOWNLOAD_HEADERS: Record<string, string> = {
  'referer': 'https://embed.wcostream.com/',
  'user-agent': USER_AGENT
};

function resolveSeriesUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const trimmed = value.replace(/^\/+/, '');
  return `${WCO_BASE_URL}/${trimmed}`;
}

interface ParsedEpisodeInfo {
  season: number;
  episode: number;
}

function parseEpisodeTitle(title: string): ParsedEpisodeInfo {
  const titleLower = title.toLowerCase();
  
  // Pattern: "Season 2 Episode 5" or "S2E5" or "S2 E5"
  const seasonEpisodeMatch = titleLower.match(/(?:season\s*(\d+)|s(\d+))\s*(?:episode\s*|e\s*)(\d+)/i);
  if (seasonEpisodeMatch) {
    const season = parseInt(seasonEpisodeMatch[1] || seasonEpisodeMatch[2], 10);
    const episode = parseInt(seasonEpisodeMatch[3], 10);
    return { season, episode };
  }
  
  // Pattern: "Season 2 Ep 5" or "S2 Ep5"
  const seasonEpMatch = titleLower.match(/(?:season\s*(\d+)|s(\d+))\s*ep\s*(\d+)/i);
  if (seasonEpMatch) {
    const season = parseInt(seasonEpMatch[1] || seasonEpMatch[2], 10);
    const episode = parseInt(seasonEpMatch[3], 10);
    return { season, episode };
  }
  
  // Pattern: "Episode 5" (no season specified = season 1)
  const episodeOnlyMatch = titleLower.match(/episode\s*(\d+)/i);
  if (episodeOnlyMatch) {
    return { season: 1, episode: parseInt(episodeOnlyMatch[1], 10) };
  }
  
  // Pattern: "Ep 5"
  const epOnlyMatch = titleLower.match(/ep\s*(\d+)/i);
  if (epOnlyMatch) {
    return { season: 1, episode: parseInt(epOnlyMatch[1], 10) };
  }
  
  // Default to season 1, episode based on position
  return { season: 1, episode: 1 };
}

function parseSeasonNumberFromTitle(title: string, url: string): number {
  const titleLower = title.toLowerCase();
  
  const patterns = [
    /season\s*(\d+)/i,
    /\bs(\d+)\b/i,
    /(\d+)(?:st|nd|rd|th)\s*season/i,
  ];
  
  for (const pattern of patterns) {
    const match = titleLower.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  const urlPatterns = [
    /season-(\d+)/i,
    /-s(\d+)-/i,
    /-s(\d+)$/i,
  ];
  
  const urlLower = url.toLowerCase();
  for (const pattern of urlPatterns) {
    const match = urlLower.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return 1;
}

function createSeasonMetadata(detail: WcoSeriesDetail): WcoSeasonMetadata {
  return {
    detailUrl: detail.url,
    episodes: detail.episodes.map((episode) => {
      const parsed = parseEpisodeTitle(episode.title);
      return {
        season: parsed.season,
        episode: parsed.episode,
        url: episode.url,
        title: episode.title
      };
    })
  };
}

function groupEpisodesBySeason(episodes: EpisodeMetadata[]): Map<number, EpisodeMetadata[]> {
  const seasonMap = new Map<number, EpisodeMetadata[]>();
  
  for (const ep of episodes) {
    const seasonEps = seasonMap.get(ep.season) || [];
    seasonEps.push(ep);
    seasonMap.set(ep.season, seasonEps);
  }
  
  // Sort episodes within each season
  for (const [_, seasonEps] of seasonMap) {
    seasonEps.sort((a, b) => a.episode - b.episode);
  }
  
  return seasonMap;
}

function detailToSeasonInfo(detail: WcoSeriesDetail, seasonNumber?: number): SourceTvSeasonInfo {
  const metadata = createSeasonMetadata(detail);
  const seasonMap = groupEpisodesBySeason(metadata.episodes);
  
  // If multiple seasons detected, filter to requested season or first season
  let targetSeason = seasonNumber ?? 1;
  if (!seasonMap.has(targetSeason)) {
    targetSeason = Math.min(...seasonMap.keys());
  }
  
  const seasonEpisodes = seasonMap.get(targetSeason) || [];
  const episodes: SourceEpisode[] = seasonEpisodes.map((ep, index) => ({
    episode_number: ep.episode,
    name: ep.title,
    metadata: ep as unknown as Record<string, unknown>
  }));
  
  return {
    type: 'tv',
    tmdbId: detail.url,
    title: detail.title,
    seasonNumber: targetSeason,
    episodes,
    metadata: metadata as unknown as Record<string, unknown>
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function fetchVideoSize(url: string): Promise<string> {
  try {
    const response = await cfFetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-0',
        'Referer': 'https://embed.wcostream.com/',
        'user-agent': USER_AGENT
      }
    });
    
    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
      if (match) {
        const bytes = parseInt(match[1], 10);
        if (!isNaN(bytes) && bytes > 0) {
          return formatFileSize(bytes);
        }
      }
    }
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      if (!isNaN(bytes) && bytes > 0) {
        return formatFileSize(bytes);
      }
    }
  } catch {
    // Ignore errors, fall through to unknown
  }
  return 'Unknown';
}

const RESOLUTION_MAP: Record<string, string> = {
  'SD': '480',
  'HD': '720',
  'Full HD': '1080'
};

async function buildDownloadEntries(info: WcoVideoInfo): Promise<DownloadEntry[]> {
  const entries: DownloadEntry[] = [];
  
  const [sdSize, hdSize, fhdSize] = await Promise.all([
    fetchVideoSize(info.url),
    info.hdUrl ? fetchVideoSize(info.hdUrl) : Promise.resolve('Unknown'),
    info.fullHdUrl ? fetchVideoSize(info.fullHdUrl) : Promise.resolve('Unknown')
  ]);
  
  entries.push({
    format: 'MP4',
    resolution: RESOLUTION_MAP['SD'] ?? '480',
    size: sdSize,
    url: info.url,
    headers: WCO_DOWNLOAD_HEADERS
  });
  
  if (info.hdUrl) {
    entries.push({
      format: 'MP4',
      resolution: RESOLUTION_MAP['HD'] ?? '720',
      size: hdSize,
      url: info.hdUrl,
      headers: WCO_DOWNLOAD_HEADERS
    });
  }
  
  if (info.fullHdUrl) {
    entries.push({
      format: 'MP4',
      resolution: RESOLUTION_MAP['Full HD'] ?? '1080',
      size: fhdSize,
      url: info.fullHdUrl,
      headers: WCO_DOWNLOAD_HEADERS
    });
  }
  
  return entries;
}

function findEpisodeUrl(metadata: WcoSeasonMetadata | undefined, season: number, episode: number | null | undefined): EpisodeMetadata | undefined {
  if (!metadata || !Number.isFinite(episode ?? NaN)) {
    return undefined;
  }
  return metadata.episodes.find((entry) => entry.season === season && entry.episode === episode);
}

function wcoOptionsFromMedia(options?: MediaSourceOptions) {
  return {
    fetchImpl: options?.fetchImpl,
    signal: options?.signal
  };
}

export class WcoMediaSource implements MediaSource {
  constructor(private client: WcoSourceClient = defaultClient) {}

  async searchByName(type: MediaType, query: string): Promise<SearchResult[]> {
    const summaries = await this.client.searchSeries(query);
    return summaries.map((entry) => ({
      tmdbId: entry.url,
      title: entry.title,
      year: 'unknown',
      metadata: { detailUrl: entry.url }
    }));
  }

  async describeFromUrl(url: string): Promise<UrlMediaInfo> {
    const detail = await this.client.getSeriesDetail(url);
    const seasonInfo = detailToSeasonInfo(detail);
    return {
      ...seasonInfo,
      url,
      season: seasonInfo.seasonNumber,
      episode: null
    };
  }

  async describeFromTmdb(_type: MediaType, tmdbId: string): Promise<SourceMediaInfo> {
    const detail = await this.client.getSeriesDetail(resolveSeriesUrl(tmdbId));
    return detailToSeasonInfo(detail);
  }

  async fetchSeasonEpisodes(tmdbId: string, season: number): Promise<SourceEpisode[]> {
    const detail = await this.client.getSeriesDetail(tmdbId);
    const metadata = createSeasonMetadata(detail);
    const seasonMap = groupEpisodesBySeason(metadata.episodes);
    
    const seasonEpisodes = seasonMap.get(season) || [];
    return seasonEpisodes.map((ep) => ({ 
      episode_number: ep.episode, 
      name: ep.title,
      metadata: ep as unknown as Record<string, unknown>
    }));
  }

  async fetchShowDetails(tmdbId: string): Promise<ShowDetailsResult> {
    const detail = await this.client.getSeriesDetail(tmdbId);
    const metadata = createSeasonMetadata(detail);
    const seasonMap = groupEpisodesBySeason(metadata.episodes);
    
    const seasons = Array.from(seasonMap.entries())
      .map(([seasonNum, episodes]) => ({
        season_number: seasonNum,
        episode_count: episodes.length
      }))
      .sort((a, b) => a.season_number - b.season_number);
    
    return {
      name: detail.title,
      seasons,
      metadata: metadata as unknown as Record<string, unknown>
    };
  }

  async fetchMovieMetadata(tmdbId: string): Promise<{ title: string }> {
    const detail = await this.client.getSeriesDetail(tmdbId);
    return { title: detail.title };
  }

  async fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions): Promise<ExtractionResult> {
    const metadata = descriptor.metadata as WcoSeasonMetadata | undefined;
    if (!metadata) {
      throw new Error('Missing WCO metadata');
    }
    const season = descriptor.season ?? 1;
    const episodeEntry = findEpisodeUrl(metadata, season, descriptor.episode);
    if (!episodeEntry) {
      throw new Error(`Episode data missing for S${season}E${descriptor.episode}`);
    }
    const videoInfo = await this.client.getVideoInfo(episodeEntry.url, wcoOptionsFromMedia(options));
    const downloads = await buildDownloadEntries(videoInfo);
    return {
      type: descriptor.type,
      tmdbId: descriptor.tmdbId,
      metadata: {
        title: descriptor.title,
        year: 'unknown',
        episodeTitle: episodeEntry.title,
        releaseDate: 'unknown'
      },
      friendlyName: `${descriptor.title} S${season}E${descriptor.episode ?? 1}`,
      downloads: { MP4: downloads },
      subtitles: [],
      downloadPage: episodeEntry.url
    };
  }
}

export function createWcoSource(client?: WcoSourceClient): MediaSource {
  return new WcoMediaSource(client);
}
