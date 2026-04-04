import { getEpisodeServers, getWatchDetail, resolveServerEmbed, searchAnime } from './api.js';
import { resolveMegaupFinalDownloads } from './megaup.js';
const defaultClient = {
    searchAnime,
    getWatchDetail,
    getEpisodeServers,
    resolveServerEmbed,
    resolveMegaupFinalDownloads
};
function anikaiTypeFromKind(kind) {
    return kind === 'MOVIE' ? 'movie' : 'tv';
}
function isCompatibleKind(type, kind) {
    return anikaiTypeFromKind(kind) === type;
}
function detailToEpisodes(detail) {
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
function detailMetadata(detail) {
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
function resolveWatchUrl(input, episode) {
    const base = input.split('#')[0];
    if (!episode)
        return base;
    return `${base}#ep=${episode}`;
}
function normalizeComparableUrl(input) {
    try {
        const url = new URL(input);
        url.hash = '';
        url.search = '';
        if (url.pathname.length > 1) {
            url.pathname = url.pathname.replace(/\/+$/, '');
        }
        return url.toString();
    }
    catch {
        return input.split('#')[0]?.split('?')[0]?.replace(/\/+$/, '') ?? input;
    }
}
function serverPriority(server) {
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
function isDubServer(server) {
    const category = server.category.trim().toLowerCase();
    return category === 'dub';
}
function embedResolutionLabel(embed) {
    return `${embed.server.category}:${embed.server.label}`;
}
function normalizeQualityResolution(value) {
    if (!value)
        return value;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
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
function embedsToFallbackDownloads(embeds) {
    return {
        EMBED: embeds.map((embed) => ({
            resolution: embedResolutionLabel(embed),
            format: 'EMBED',
            size: 'Unknown',
            url: embed.url
        }))
    };
}
function metadataSeasons(metadata) {
    const raw = metadata?.seasons;
    if (!Array.isArray(raw))
        return [];
    return raw.flatMap((entry) => {
        if (!entry || typeof entry !== 'object')
            return [];
        const seasonNumber = Number(entry.seasonNumber);
        const url = typeof entry.url === 'string'
            ? entry.url
            : null;
        if (!Number.isFinite(seasonNumber) || !url)
            return [];
        const episodeCountRaw = entry.episodeCount;
        const episodeCount = typeof episodeCountRaw === 'number' && Number.isFinite(episodeCountRaw)
            ? episodeCountRaw
            : null;
        const label = typeof entry.label === 'string'
            ? entry.label
            : `Season ${seasonNumber}`;
        return [{
                seasonNumber,
                url,
                episodeCount,
                label
            }];
    });
}
function findSeasonUrl(detail, metadata, season) {
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
function dedupeDownloadEntries(entries) {
    const seen = new Set();
    return entries.filter((entry) => {
        const key = `${entry.url}::${entry.resolution ?? ''}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
async function resolveCanonicalShowTitle(client, detail) {
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
    }
    catch {
        return detail.title;
    }
}
export class AnikaiMediaSource {
    constructor(client = defaultClient) {
        this.client = client;
    }
    async searchByName(type, query) {
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
    async describeFromUrl(url) {
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
    async describeFromTmdb() {
        throw new Error('AnimeKAI TMDb lookups are not implemented yet');
    }
    async fetchSeasonEpisodes(tmdbId, season) {
        const detail = await this.client.getWatchDetail(tmdbId);
        const seasonUrl = findSeasonUrl(detail, undefined, season);
        if (!seasonUrl)
            return [];
        if (seasonUrl === detail.canonicalUrl || season === detail.currentSeasonNumber) {
            return detailToEpisodes(detail);
        }
        const seasonDetail = await this.client.getWatchDetail(seasonUrl);
        return detailToEpisodes(seasonDetail);
    }
    async fetchShowDetails(tmdbId) {
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
                    }]).map((season) => ({
                season_number: season.seasonNumber,
                episode_count: season.episodeCount ?? undefined
            })),
            metadata: detailMetadata(detail)
        };
    }
    async fetchMovieMetadata(tmdbId) {
        const detail = await this.client.getWatchDetail(tmdbId);
        return { title: detail.title };
    }
    async fetchDownloads(descriptor, options) {
        const requestedUrl = typeof descriptor.metadata?.detailUrl === 'string' ? descriptor.metadata.detailUrl : descriptor.tmdbId;
        const requestedWatchUrl = resolveWatchUrl(requestedUrl, descriptor.type === 'tv' ? descriptor.episode : null);
        const initialDetail = await this.client.getWatchDetail(requestedWatchUrl, options);
        const seasonWatchUrl = descriptor.type === 'tv'
            ? findSeasonUrl(initialDetail, descriptor.metadata, descriptor.season)
            : initialDetail.canonicalUrl;
        const watchUrl = resolveWatchUrl(seasonWatchUrl ?? initialDetail.canonicalUrl, descriptor.type === 'tv' ? descriptor.episode : null);
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
        const embeds = await Promise.all([...selectedServers]
            .sort((left, right) => serverPriority(left) - serverPriority(right))
            .map((server) => this.client.resolveServerEmbed(server.lid, watchUrl, server, options)));
        const finalSettled = await Promise.allSettled(embeds.map(async (embed) => ({
            embed,
            final: embed.url.startsWith('https://megaup.')
                ? await this.client.resolveMegaupFinalDownloads(embed.url, options)
                : null
        })));
        const mp4Downloads = [];
        const embedFallbacks = [];
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
        const downloads = {};
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
export function createAnikaiSource(client) {
    return new AnikaiMediaSource(client);
}
