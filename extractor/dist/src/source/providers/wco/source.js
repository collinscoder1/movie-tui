import { getSeriesDetail, getVideoInfo, searchSeries } from './index.js';
import { filenameParse } from '@ctrl/video-filename-parser';
const defaultClient = {
    searchSeries,
    getSeriesDetail,
    getVideoInfo
};
const WCO_BASE_URL = 'https://www.wcoflix.tv';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
const WCO_DOWNLOAD_HEADERS = {
    'referer': 'https://embed.wcostream.com/',
    'user-agent': USER_AGENT
};
function resolveSeriesUrl(value) {
    if (/^https?:\/\//i.test(value)) {
        return value;
    }
    const trimmed = value.replace(/^\/+/, '');
    return `${WCO_BASE_URL}/${trimmed}`;
}
function isMovie(title) {
    return (/movie/i.test(title) && !/episode/i.test(title)) || /recap/i.test(title);
}
function extractArcName(title) {
    if (isMovie(title))
        return null;
    const colonMatch = title.match(/:\s*([^:]+?)(?:\s+(?:Episode|Ep)\b)/i);
    if (colonMatch) {
        const arc = colonMatch[1].trim();
        if (!arc.match(/^(English|Dubbed|Subbed|HD|FullHD|4K)$/i)) {
            return arc;
        }
    }
    return null;
}
function parseEpisodeTitle(title) {
    if (isMovie(title)) {
        return { season: 0, episode: 0, arc: null };
    }
    const parsed = filenameParse(title, true);
    let season = parsed.seasons?.[0] || null;
    let episode = parsed.episodeNumbers?.[0] || 0;
    if (!season) {
        const seasonMatch = title.toLowerCase().match(/season\s*(\d+)/i);
        if (seasonMatch) {
            season = parseInt(seasonMatch[1], 10);
        }
    }
    if (!episode) {
        const epMatch = title.toLowerCase().match(/episode\s*(\d+)/i);
        if (epMatch) {
            episode = parseInt(epMatch[1], 10);
        }
    }
    const arc = extractArcName(title);
    return { season: season || 1, episode, arc };
}
function createSeasonMetadata(detail) {
    const parsed = detail.episodes.map((ep) => ({
        ...parseEpisodeTitle(ep.title),
        url: ep.url,
        title: ep.title
    }));
    const explicitSeasons = new Set(parsed.filter(p => p.season > 1).map(p => p.season));
    if (explicitSeasons.size === 0) {
        const arcs = new Map();
        const noArc = [];
        for (const p of parsed) {
            if (p.season === 0) {
                console.warn(`[WCO] Skipping movie entry: ${p.title}`);
                continue;
            }
            if (p.arc) {
                const list = arcs.get(p.arc) || [];
                list.push(p);
                arcs.set(p.arc, list);
            }
            else {
                noArc.push(p);
            }
        }
        if (arcs.size > 0 && noArc.length > 0) {
            for (const p of noArc) {
                p.season = 1;
            }
            const sortedArcs = Array.from(arcs.entries())
                .sort((a, b) => {
                const minA = Math.min(...a[1].map(e => parsed.findIndex(p => p.url === e.url)));
                const minB = Math.min(...b[1].map(e => parsed.findIndex(p => p.url === e.url)));
                return minA - minB;
            });
            let seasonNum = 2;
            for (const [_, arcEps] of sortedArcs) {
                for (const p of arcEps) {
                    p.season = seasonNum;
                }
                seasonNum++;
            }
        }
    }
    return { detailUrl: detail.url, episodes: parsed };
}
function groupEpisodesBySeason(episodes) {
    const seasonMap = new Map();
    const skipped = [];
    for (const ep of episodes) {
        if (ep.season === 0) {
            skipped.push(`${ep.title} (season 0)`);
            continue;
        }
        if (ep.episode === 0) {
            skipped.push(`${ep.title} (episode 0)`);
            continue;
        }
        if (!seasonMap.has(ep.season)) {
            seasonMap.set(ep.season, new Map());
        }
        const episodeMap = seasonMap.get(ep.season);
        if (!episodeMap.has(ep.episode)) {
            episodeMap.set(ep.episode, ep);
        }
    }
    if (skipped.length > 0) {
        const preview = skipped.slice(0, 5).join(', ');
        console.warn(`[WCO] Skipped ${skipped.length} unparseable entries: ${preview}${skipped.length > 5 ? '...' : ''}`);
    }
    const result = new Map();
    for (const [season, epMap] of seasonMap) {
        result.set(season, Array.from(epMap.values()).sort((a, b) => a.episode - b.episode));
    }
    return result;
}
function detailToSeasonInfo(detail, seasonNumber) {
    const metadata = createSeasonMetadata(detail);
    const seasonMap = groupEpisodesBySeason(metadata.episodes);
    let targetSeason = seasonNumber ?? 1;
    if (!seasonMap.has(targetSeason)) {
        targetSeason = Math.min(...seasonMap.keys());
    }
    const seasonEpisodes = seasonMap.get(targetSeason) || [];
    const episodes = seasonEpisodes.map((ep) => ({
        episode_number: ep.episode,
        name: ep.title,
        metadata: ep
    }));
    return {
        type: 'tv',
        tmdbId: detail.url,
        title: detail.title,
        seasonNumber: targetSeason,
        episodes,
        metadata: metadata
    };
}
const RESOLUTION_MAP = {
    'SD': '480',
    'HD': '720',
    'Full HD': '1080'
};
async function buildDownloadEntries(info) {
    const entries = [];
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
function findEpisodeUrl(metadata, season, episode) {
    if (!metadata || !Number.isFinite(episode ?? NaN)) {
        return undefined;
    }
    return metadata.episodes.find((entry) => entry.season === season && entry.episode === episode);
}
function wcoOptionsFromMedia(options) {
    return {
        fetchImpl: options?.fetchImpl,
        signal: options?.signal
    };
}
export class WcoMediaSource {
    constructor(client = defaultClient) {
        this.client = client;
    }
    async searchByName(_type, query) {
        const summaries = await this.client.searchSeries(query);
        return summaries.map((entry) => ({
            tmdbId: entry.url,
            title: entry.title,
            year: 'unknown',
            metadata: { detailUrl: entry.url }
        }));
    }
    async describeFromUrl(url) {
        const detail = await this.client.getSeriesDetail(url);
        const seasonInfo = detailToSeasonInfo(detail);
        return {
            ...seasonInfo,
            url,
            season: seasonInfo.seasonNumber,
            episode: null
        };
    }
    async describeFromTmdb(_type, tmdbId) {
        const detail = await this.client.getSeriesDetail(resolveSeriesUrl(tmdbId));
        return detailToSeasonInfo(detail);
    }
    async fetchSeasonEpisodes(tmdbId, season) {
        const detail = await this.client.getSeriesDetail(tmdbId);
        const metadata = createSeasonMetadata(detail);
        const seasonMap = groupEpisodesBySeason(metadata.episodes);
        const seasonEpisodes = seasonMap.get(season) || [];
        return seasonEpisodes.map((ep) => ({
            episode_number: ep.episode,
            name: ep.title,
            metadata: ep
        }));
    }
    async fetchShowDetails(tmdbId) {
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
            metadata: metadata
        };
    }
    async fetchMovieMetadata(tmdbId) {
        const detail = await this.client.getSeriesDetail(tmdbId);
        return { title: detail.title };
    }
    async fetchDownloads(descriptor, options) {
        const metadata = descriptor.metadata;
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
export function createWcoSource(client) {
    return new WcoMediaSource(client);
}
