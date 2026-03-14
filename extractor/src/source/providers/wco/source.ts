import type { EpisodeDescriptor, SearchResult } from '../../../search.js';
import type { ExtractionResult, DownloadEntry } from '../../../extractor.js';
import type { MediaSource, MediaSourceOptions, MediaType, SourceEpisode, SourceMediaInfo, SourceTvSeasonInfo, UrlMediaInfo, ShowDetailsResult } from '../../types.js';
import { getSeriesDetail, getVideoInfo, searchSeries } from '../../../wco/index.js';
import type { WcoSeriesDetail, WcoSeriesSummary, WcoVideoInfo } from '../../../wco/types.js';

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

function parseEpisodeNumber(title: string): number {
  const titleLower = title.toLowerCase();
  
  // "Season X Episode Y" or "SXEY"
  const seasonEp = titleLower.match(/(?:season\s*\d+|s\d+)\s*(?:episode\s*|e\s*)(\d+)/i);
  if (seasonEp) return parseInt(seasonEp[1], 10);
  
  // "Episode X" or "Ep X"
  const epOnly = titleLower.match(/(?:episode|ep)\s*(\d+)/i);
  if (epOnly) return parseInt(epOnly[1], 10);
  
  return 0;
}

function parseSeasonFromTitle(title: string): number | null {
  const titleLower = title.toLowerCase();
  const match = titleLower.match(/(?:season\s*(\d+)|s(\d+)\s*(?:episode|ep|e))/i);
  if (match) return parseInt(match[1] || match[2], 10);
  return null;
}

function isMovie(title: string): boolean {
  return /movie/i.test(title) && !/episode/i.test(title);
}

function isRecap(title: string): boolean {
  return /recap/i.test(title);
}

function extractArcName(title: string): string | null {
  if (isMovie(title) || isRecap(title)) return null;
  
  // Pattern: "Show: Arc Name Episode X"
  const colonMatch = title.match(/:\s*([^:]+?)(?:\s+(?:Episode|Ep)\b)/i);
  if (colonMatch) {
    const arc = colonMatch[1].trim();
    if (!arc.match(/^(English|Dubbed|Subbed|HD|FullHD|4K)$/i)) {
      return arc;
    }
  }
  
  return null;
}

function createSeasonMetadata(detail: WcoSeriesDetail): WcoSeasonMetadata {
  const episodes = detail.episodes.map((episode) => {
    const season = parseSeasonFromTitle(episode.title);
    const episodeNum = parseEpisodeNumber(episode.title);
    const arc = extractArcName(episode.title);
    const movie = isMovie(episode.title);
    const recap = isRecap(episode.title);
    
    return {
      season: season || 1,
      episode: episodeNum || 1,
      url: episode.url,
      title: episode.title,
      arc,
      isMovie: movie,
      isRecap: recap
    };
  });
  
  // Apply arc-based season detection if needed
  const explicitSeasons = new Set(
    episodes.filter(p => !p.isMovie && !p.isRecap && parseSeasonFromTitle(p.title) !== null)
      .map(p => p.season)
  );
  
  if (explicitSeasons.size <= 1) {
    const arcs = new Map<string, typeof episodes>();
    const noArc: typeof episodes = [];
    
    for (const ep of episodes) {
      if (ep.isMovie || ep.isRecap) {
        ep.season = 0;
      } else if (ep.arc) {
        const list = arcs.get(ep.arc!) || [];
        list.push(ep);
        arcs.set(ep.arc!, list);
      } else {
        noArc.push(ep);
      }
    }
    
    if (arcs.size >= 1 && noArc.length > 0) {
      for (const ep of noArc) {
        ep.season = 1;
      }
      
      const sortedArcs = Array.from(arcs.entries())
        .sort((a, b) => {
          const minA = Math.min(...a[1].map(e => episodes.findIndex(ep => ep.url === e.url)));
          const minB = Math.min(...b[1].map(e => episodes.findIndex(ep => ep.url === e.url)));
          return minA - minB;
        });
      
      let seasonNum = 2;
      for (const [_, arcEps] of sortedArcs) {
        for (const ep of arcEps) {
          ep.season = seasonNum;
        }
        seasonNum++;
      }
    }
  }
  
  return { detailUrl: detail.url, episodes };
}

function groupEpisodesBySeason(episodes: EpisodeMetadata[]): Map<number, EpisodeMetadata[]> {
  const seasonMap = new Map<number, EpisodeMetadata[]>();
  
  for (const ep of episodes) {
    if (ep.season === 0) continue; // Skip movies
    const seasonEps = seasonMap.get(ep.season) || [];
    seasonEps.push(ep);
    seasonMap.set(ep.season, seasonEps);
  }
  
  for (const [_, seasonEps] of seasonMap) {
    seasonEps.sort((a, b) => a.episode - b.episode);
  }
  
  return seasonMap;
}

function detailToSeasonInfo(detail: WcoSeriesDetail, seasonNumber?: number): SourceTvSeasonInfo {
  const metadata = createSeasonMetadata(detail);
  const seasonMap = groupEpisodesBySeason(metadata.episodes);
  
  let targetSeason = seasonNumber ?? 1;
  if (!seasonMap.has(targetSeason)) {
    targetSeason = Math.min(...seasonMap.keys());
  }
  
  const seasonEpisodes = seasonMap.get(targetSeason) || [];
  const episodes: SourceEpisode[] = seasonEpisodes.map((ep) => ({
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

const RESOLUTION_MAP: Record<string, string> = {
  'SD': '480',
  'HD': '720',
  'Full HD': '1080'
};

async function buildDownloadEntries(info: WcoVideoInfo): Promise<DownloadEntry[]> {
  const entries: DownloadEntry[] = [];
  
  entries.push({
    format: 'MP4',
    resolution: RESOLUTION_MAP['SD'] ?? '480',
    size: 'Unknown',
    url: info.url,
    headers: WCO_DOWNLOAD_HEADERS
  });
  
  if (info.hdUrl) {
    entries.push({
      format: 'MP4',
      resolution: RESOLUTION_MAP['HD'] ?? '720',
      size: 'Unknown',
      url: info.hdUrl,
      headers: WCO_DOWNLOAD_HEADERS
    });
  }
  
  if (info.fullHdUrl) {
    entries.push({
      format: 'MP4',
      resolution: RESOLUTION_MAP['Full HD'] ?? '1080',
      size: 'Unknown',
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
