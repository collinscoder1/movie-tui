import type {
  DownloadEntry,
  EpisodeDescriptor,
  ExtractionResult,
  MediaSource,
  MediaSourceOptions,
  MediaType,
  SearchResult,
  ShowDetailsResult,
  SourceEpisode,
  SourceMediaInfo,
  UrlMediaInfo
} from '../../types.js';
import { getEpisodeServers, getWatchDetail, resolveServerEmbed, searchAnime } from './api.js';
import { resolveMegaupFinalDownloads } from './megaup.js';
import type { AnikaiResolvedEmbed, AnikaiSearchEntry, AnikaiSeasonLink, AnikaiServerEntry, AnikaiWatchDetail } from './types.js';

export interface AnikaiSourceClient {
  searchAnime(query: string, options?: Parameters<typeof searchAnime>[1]): Promise<AnikaiSearchEntry[]>;
  getWatchDetail(watchUrl: string, options?: Parameters<typeof getWatchDetail>[1]): Promise<AnikaiWatchDetail>;
  getEpisodeServers(token: string, watchUrl: string, options?: Parameters<typeof getEpisodeServers>[2]): Promise<AnikaiServerEntry[]>;
  resolveServerEmbed(lid: string, watchUrl: string, server: AnikaiServerEntry, options?: Parameters<typeof resolveServerEmbed>[3]): Promise<AnikaiResolvedEmbed>;
  resolveMegaupFinalDownloads(embedUrl: string, options?: Parameters<typeof resolveMegaupFinalDownloads>[1]): Promise<Awaited<ReturnType<typeof resolveMegaupFinalDownloads>>>;
}

const defaultClient: AnikaiSourceClient = {
  searchAnime,
  getWatchDetail,
  getEpisodeServers,
  resolveServerEmbed,
  resolveMegaupFinalDownloads
};

function anikaiTypeFromKind(kind: string | null): MediaType {
  return kind === 'MOVIE' ? 'movie' : 'tv';
}

function isCompatibleKind(type: MediaType, kind: string | null): boolean {
  return anikaiTypeFromKind(kind) === type;
}

function detailToEpisodes(detail: AnikaiWatchDetail): SourceEpisode[] {
  return detail.episodes.map((episode) => ({
    episode_number: episode.episode,
    name: episode.title,
    metadata: {
      seriesUrl: detail.seriesUrl,
      canonicalUrl: detail.canonicalUrl,
      token: episode.token ?? null,
      slug: episode.slug ?? null,
      langs: episode.langs ?? null
    }
  }));
}

function detailMetadata(detail: AnikaiWatchDetail) {
  return {
    animeId: detail.animeId,
    mediaKind: detail.mediaKind,
    detailUrl: detail.canonicalUrl,
    seriesUrl: detail.seriesUrl,
    episodeCount: detail.episodeCount,
    currentSeasonNumber: detail.currentSeasonNumber,
    seasons: detail.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      url: season.url,
      episodeCount: season.episodeCount,
      label: season.label
    }))
  };
}

function resolveWatchUrl(input: string, episode: number | null): string {
  const base = input.split('#')[0];
  if (!episode) return base;
  return `${base}#ep=${episode}`;
}

function normalizeComparableUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = '';
    url.search = '';
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.toString();
  } catch {
    return input.split('#')[0]?.split('?')[0]?.replace(/\/+$/, '') ?? input;
  }
}

function serverPriority(server: AnikaiServerEntry): number {
  const categoryScore = server.category === 'dub'
    ? 0
    : server.category === 'sub'
      ? 10
      : server.category === 'softsub'
        ? 20
        : 30;
  const sidScore = server.sid === '3' ? 0 : server.sid === '2' ? 1 : 5;
  return categoryScore + sidScore;
}

function isDubServer(server: AnikaiServerEntry): boolean {
  const category = server.category.trim().toLowerCase();
  return category === 'dub';
}

function embedResolutionLabel(embed: AnikaiResolvedEmbed): string {
  return `${embed.server.category}:${embed.server.label}`;
}

function normalizeQualityResolution(value: string | null): string | null {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directMatch = trimmed.match(/\b(1080|720|480|360)p?\b/i);
  if (directMatch) {
    return `${directMatch[1]}p`;
  }

  const dimensionsMatch = trimmed.match(/(\d+)\s*x\s*(\d+)/i);
  if (dimensionsMatch) {
    const height = dimensionsMatch[2];
    if (['1080', '720', '480', '360'].includes(height)) {
      return `${height}p`;
    }
  }

  return trimmed;
}

function embedsToFallbackDownloads(embeds: AnikaiResolvedEmbed[]): Record<string, DownloadEntry[]> {
  return {
    EMBED: embeds.map((embed) => ({
      resolution: embedResolutionLabel(embed),
      format: 'EMBED',
      size: 'Unknown',
      url: embed.url
    }))
  };
}

function metadataSeasons(metadata: Record<string, unknown> | undefined): AnikaiSeasonLink[] {
  const raw = metadata?.seasons;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const seasonNumber = Number((entry as { seasonNumber?: unknown }).seasonNumber);
    const url = typeof (entry as { url?: unknown }).url === 'string'
      ? (entry as { url: string }).url
      : null;
    if (!Number.isFinite(seasonNumber) || !url) return [];

    const episodeCountRaw = (entry as { episodeCount?: unknown }).episodeCount;
    const episodeCount = typeof episodeCountRaw === 'number' && Number.isFinite(episodeCountRaw)
      ? episodeCountRaw
      : null;
    const label = typeof (entry as { label?: unknown }).label === 'string'
      ? (entry as { label: string }).label
      : `Season ${seasonNumber}`;

    return [{
      seasonNumber,
      url,
      episodeCount,
      label
    }];
  });
}

function findSeasonUrl(
  detail: AnikaiWatchDetail,
  metadata: Record<string, unknown> | undefined,
  season: number | null
): string | null {
  if (!season) {
    return detail.canonicalUrl;
  }

  const seasonLinks = detail.seasons.length > 0 ? detail.seasons : metadataSeasons(metadata);
  const match = seasonLinks.find((entry) => entry.seasonNumber === season);
  if (match?.url) {
    return match.url;
  }

  if (detail.currentSeasonNumber === season) {
    return detail.canonicalUrl;
  }

  if (season === 1 && seasonLinks.length === 0) {
    return detail.canonicalUrl;
  }

  return null;
}

function dedupeDownloadEntries(entries: DownloadEntry[]): DownloadEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.url}::${entry.resolution ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function resolveCanonicalShowTitle(
  client: AnikaiSourceClient,
  detail: AnikaiWatchDetail
): Promise<string> {
  if (anikaiTypeFromKind(detail.mediaKind) !== 'tv') {
    return detail.title;
  }

  const seasonOneUrl = detail.seasons.find((season) => season.seasonNumber === 1)?.url
    ?? detail.seriesUrl
    ?? detail.canonicalUrl;

  if (!seasonOneUrl) {
    return detail.title;
  }

  if (normalizeComparableUrl(seasonOneUrl) === normalizeComparableUrl(detail.canonicalUrl)) {
    return detail.title;
  }

  try {
    const canonicalDetail = await client.getWatchDetail(seasonOneUrl);
    return canonicalDetail.title || detail.title;
  } catch {
    return detail.title;
  }
}

export class AnikaiMediaSource implements MediaSource {
  constructor(private client: AnikaiSourceClient = defaultClient) {}

  async searchByName(type: MediaType, query: string): Promise<SearchResult[]> {
    const items = await this.client.searchAnime(query);
    return items
      .filter((item) => isCompatibleKind(type, item.kind))
      .map((item) => ({
        tmdbId: item.url,
        title: item.title,
        year: 'unknown',
        metadata: {
          detailUrl: item.url,
          mediaKind: item.kind,
          episodeCount: item.episodeCount,
          subCount: item.subCount,
          dubCount: item.dubCount
        }
      }));
  }

  async describeFromUrl(url: string): Promise<UrlMediaInfo> {
    const detail = await this.client.getWatchDetail(url);
    const type = anikaiTypeFromKind(detail.mediaKind);
    const normalizedTitle = type === 'tv'
      ? await resolveCanonicalShowTitle(this.client, detail)
      : detail.title;
    if (type === 'movie') {
      return {
        type: 'movie',
        tmdbId: detail.canonicalUrl,
        title: normalizedTitle,
        url,
        season: null,
        episode: null,
        metadata: detailMetadata(detail)
      };
    }
    return {
      type: 'tv',
      tmdbId: detail.canonicalUrl,
      title: normalizedTitle,
      seasonNumber: detail.currentSeasonNumber ?? 1,
      episodes: detailToEpisodes(detail),
      season: detail.currentSeasonNumber ?? 1,
      episode: detail.currentEpisode,
      url,
      metadata: detailMetadata(detail)
    };
  }

  async describeFromTmdb(): Promise<never> {
    throw new Error('AnimeKAI TMDb lookups are not implemented yet');
  }

  async fetchSeasonEpisodes(tmdbId: string, season: number): Promise<SourceEpisode[]> {
    const detail = await this.client.getWatchDetail(tmdbId);
    const seasonUrl = findSeasonUrl(detail, undefined, season);
    if (!seasonUrl) return [];

    if (seasonUrl === detail.canonicalUrl || season === detail.currentSeasonNumber) {
      return detailToEpisodes(detail);
    }

    const seasonDetail = await this.client.getWatchDetail(seasonUrl);
    return detailToEpisodes(seasonDetail);
  }

  async fetchShowDetails(tmdbId: string): Promise<ShowDetailsResult> {
    const detail = await this.client.getWatchDetail(tmdbId);
    const normalizedTitle = await resolveCanonicalShowTitle(this.client, detail);
    return {
      name: normalizedTitle,
      seasons: (detail.seasons.length > 0
        ? detail.seasons
        : [{
            seasonNumber: 1,
            url: detail.canonicalUrl,
            episodeCount: detail.episodeCount ?? detail.episodes.length,
            label: 'Season 1'
          }]
      ).map((season) => ({
        season_number: season.seasonNumber,
        episode_count: season.episodeCount ?? undefined
      })),
      metadata: detailMetadata(detail)
    };
  }

  async fetchMovieMetadata(tmdbId: string): Promise<{ title: string }> {
    const detail = await this.client.getWatchDetail(tmdbId);
    return { title: detail.title };
  }

  async fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions): Promise<ExtractionResult> {
    const requestedUrl = typeof descriptor.metadata?.detailUrl === 'string' ? descriptor.metadata.detailUrl : descriptor.tmdbId;
    const requestedWatchUrl = resolveWatchUrl(
      requestedUrl,
      descriptor.type === 'tv' ? descriptor.episode : null
    );

    const initialDetail = await this.client.getWatchDetail(requestedWatchUrl, options);
    const seasonWatchUrl = descriptor.type === 'tv'
      ? findSeasonUrl(initialDetail, descriptor.metadata, descriptor.season)
      : initialDetail.canonicalUrl;

    const watchUrl = resolveWatchUrl(
      seasonWatchUrl ?? initialDetail.canonicalUrl,
      descriptor.type === 'tv' ? descriptor.episode : null
    );

    const detail = watchUrl === requestedWatchUrl
      ? initialDetail
      : await this.client.getWatchDetail(watchUrl, options);
    const targetEpisodeNumber = descriptor.type === 'tv'
      ? (descriptor.episode ?? detail.currentEpisode ?? detail.episodes[0]?.episode ?? null)
      : (detail.currentEpisode ?? detail.episodes[0]?.episode ?? null);

    const episode = detail.episodes.find((entry) => entry.episode === targetEpisodeNumber) ?? detail.episodes[0];
    if (!episode?.token) {
      throw new Error('AnimeKAI episode token is missing for the selected episode');
    }

    const servers = await this.client.getEpisodeServers(episode.token, watchUrl, options);
    if (servers.length === 0) {
      throw new Error('AnimeKAI returned no playable servers for the selected episode');
    }

    const selectedServers = servers.filter(isDubServer);
    if (selectedServers.length === 0) {
      throw new Error('AnimeKAI returned no dubbed servers for the selected episode');
    }

    const embeds = await Promise.all(
      [...selectedServers]
        .sort((left, right) => serverPriority(left) - serverPriority(right))
        .map((server) => this.client.resolveServerEmbed(server.lid, watchUrl, server, options))
    );

    const finalSettled = await Promise.allSettled(
      embeds.map(async (embed) => ({
        embed,
        final: embed.url.startsWith('https://megaup.')
          ? await this.client.resolveMegaupFinalDownloads(embed.url, options)
          : null
      }))
    );

    const mp4Downloads: DownloadEntry[] = [];
    const embedFallbacks: DownloadEntry[] = [];

    finalSettled.forEach((settled, index) => {
      const embed = embeds[index];
      if (settled.status === 'fulfilled' && settled.value.final?.entries.length) {
        for (const entry of settled.value.final.entries) {
          mp4Downloads.push({
            resolution: normalizeQualityResolution(entry.resolution) ?? embedResolutionLabel(embed),
            format: 'MP4',
            size: 'Unknown',
            url: entry.downloadUrl
          });
        }
        return;
      }

      embedFallbacks.push({
        resolution: embedResolutionLabel(embed),
        format: 'EMBED',
        size: 'Unknown',
        url: embed.url
      });
    });

    const downloads: Record<string, DownloadEntry[]> = {};
    const uniqueMp4Downloads = dedupeDownloadEntries(mp4Downloads);
    if (uniqueMp4Downloads.length > 0) {
      downloads.MP4 = uniqueMp4Downloads;
    }
    if (embedFallbacks.length > 0) {
      downloads.EMBED = dedupeDownloadEntries(embedFallbacks);
    }
    if (Object.keys(downloads).length === 0) {
      Object.assign(downloads, embedsToFallbackDownloads(embeds));
    }

    return {
      type: descriptor.type,
      tmdbId: descriptor.tmdbId,
      metadata: {
        title: detail.title,
        year: 'unknown',
        episodeTitle: episode.title
      },
      friendlyName: `${detail.title}${targetEpisodeNumber ? ` - Episode ${targetEpisodeNumber}` : ''}`,
      downloads,
      subtitles: [],
      downloadPage: watchUrl
    };
  }
}

export function createAnikaiSource(client?: AnikaiSourceClient): MediaSource {
  return new AnikaiMediaSource(client);
}
