import { movieboxPost, movieboxGet } from './client.js';
function toType(subjectType) {
    switch (subjectType) {
        case 1:
            return 'movie';
        case 2:
            return 'tv';
        case 6:
            return 'anime';
        default:
            return 'other';
    }
}
function normalizePager(pager) {
    const page = typeof pager?.page === 'number' ? pager.page : Number(pager?.page ?? 1);
    return {
        hasMore: pager?.hasMore ?? false,
        page: Number.isFinite(page) ? page : 1,
        perPage: Number(pager?.perPage ?? 30),
        totalCount: Number(pager?.totalCount ?? 0)
    };
}
export function parseSearchResponse(payload) {
    const items = Array.isArray(payload.data.items) ? payload.data.items : [];
    return {
        pager: normalizePager(payload.data.pager),
        items: items.map((item) => ({
            subjectId: item.subjectId,
            detailPath: item.detailPath,
            title: item.title,
            releaseDate: item.releaseDate,
            type: toType(item.subjectType),
            coverUrl: item.cover?.url,
            hasResource: item.hasResource ?? false
        }))
    };
}
function toFiniteNumber(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
}
function parseEpisodeNumber(entry) {
    return (toFiniteNumber(entry.ep) ??
        toFiniteNumber(entry.episode) ??
        toFiniteNumber(entry.episodeNum) ??
        toFiniteNumber(entry.epNum));
}
function parseSeasonNumber(entry, fallback) {
    return (toFiniteNumber(entry.se) ??
        toFiniteNumber(entry.season) ??
        toFiniteNumber(entry.seasonNum) ??
        toFiniteNumber(entry.seasonNumber) ??
        fallback);
}
function parseEpisodeNumbersFromSeason(season) {
    const episodes = [];
    if (typeof season.allEp === 'string' && season.allEp.trim()) {
        const parsed = season.allEp
            .split(',')
            .map((value) => Number.parseInt(value.trim(), 10))
            .filter((num) => Number.isFinite(num) && num > 0);
        if (parsed.length > 0) {
            episodes.push(...parsed);
        }
    }
    if (episodes.length > 0) {
        return Array.from(new Set(episodes)).sort((a, b) => a - b);
    }
    const maxEp = toFiniteNumber(season.maxEp);
    if (maxEp && maxEp > 0) {
        return Array.from({ length: maxEp }, (_, idx) => idx + 1);
    }
    if (Array.isArray(season.resolutions)) {
        const numbers = season.resolutions
            .map((item) => toFiniteNumber(item?.epNum))
            .filter((value) => value !== null && value > 0);
        if (numbers.length > 0) {
            return Array.from(new Set(numbers)).sort((a, b) => a - b);
        }
    }
    return [];
}
function collectEpisodePairs(detail, resource) {
    const pairs = [];
    const pushPair = (season, episode, title) => {
        if (!Number.isFinite(season) || !Number.isFinite(episode))
            return;
        pairs.push({ season, episode, title });
    };
    const seasonSources = [
        detail.seasonList,
        detail.seasons,
        resource?.seasons
    ];
    const parseSeasonSource = (source) => {
        if (!Array.isArray(source) || source.length === 0) {
            return false;
        }
        source.forEach((season, index) => {
            const seasonNumber = parseSeasonNumber(season, index + 1);
            const explicitEpisodes = season.episodes ?? season.episodeList ?? season.list ?? season.videoList ?? season.videos;
            if (Array.isArray(explicitEpisodes) && explicitEpisodes.length > 0) {
                explicitEpisodes.forEach((entry) => {
                    const episodeNumber = parseEpisodeNumber(entry);
                    if (episodeNumber !== null) {
                        pushPair(seasonNumber, episodeNumber, entry.title ?? entry.name);
                    }
                });
                return;
            }
            const numbers = parseEpisodeNumbersFromSeason(season);
            numbers.forEach((episodeNumber) => {
                pushPair(seasonNumber, episodeNumber);
            });
        });
        return true;
    };
    for (const source of seasonSources) {
        if (parseSeasonSource(source)) {
            return pairs;
        }
    }
    const fallbackArrays = ['episodeList', 'episodes', 'videoList', 'videos'];
    const detailRecord = detail;
    for (const field of fallbackArrays) {
        const list = detailRecord[field];
        if (Array.isArray(list) && list.length > 0) {
            list.forEach((entry) => {
                const seasonNumber = parseSeasonNumber(entry, 1);
                const episodeNumber = parseEpisodeNumber(entry);
                if (episodeNumber !== null) {
                    pushPair(seasonNumber, episodeNumber, entry.title ?? entry.name);
                }
            });
            return pairs;
        }
    }
    return pairs;
}
function buildSeasons(detail, resource) {
    const pairs = collectEpisodePairs(detail, resource);
    if (!pairs.length) {
        return [];
    }
    const seasonMap = new Map();
    for (const pair of pairs) {
        const seasonEntries = seasonMap.get(pair.season) ?? new Map();
        if (!seasonEntries.has(pair.episode)) {
            seasonEntries.set(pair.episode, {
                season: pair.season,
                episode: pair.episode,
                detailPath: detail.detailPath,
                subjectId: detail.subjectId,
                title: pair.title
            });
        }
        seasonMap.set(pair.season, seasonEntries);
    }
    return Array.from(seasonMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([seasonNumber, episodesMap]) => ({
        seasonNumber,
        episodes: Array.from(episodesMap.values()).sort((a, b) => a.episode - b.episode)
    }));
}
export function parseDetailResponse(payload) {
    const subject = payload.data.subject;
    const resource = payload.data.resource;
    const seasons = [];
    const parsedSeasons = buildSeasons(subject, resource);
    seasons.push(...parsedSeasons);
    return {
        subjectId: subject.subjectId,
        detailPath: subject.detailPath,
        title: subject.title,
        type: toType(subject.subjectType),
        releaseDate: subject.releaseDate,
        hasResource: subject.hasResource ?? false,
        coverUrl: subject.cover?.url,
        seasons
    };
}
export function parseDownloadResponse(payload) {
    const downloads = Array.isArray(payload.data.downloads)
        ? payload.data.downloads.map((item) => ({
            format: item.format ?? 'MP4',
            resolution: item.resolution ? String(item.resolution) : null,
            url: item.url,
            size: item.size !== undefined ? String(item.size) : undefined
        }))
        : [];
    const subtitles = Array.isArray(payload.data.captions)
        ? payload.data.captions
            .filter((caption) => Boolean(caption.lanName && caption.url))
            .map((caption) => ({
            lanName: caption.lanName,
            url: caption.url,
            size: caption.size !== undefined ? String(caption.size) : undefined
        }))
        : [];
    return {
        downloads,
        subtitles,
        hasResource: payload.data.hasResource ?? downloads.length > 0
    };
}
export async function searchSubjects(options) {
    const { keyword, page = 1, perPage = 30, subjectType, ...fetchOpts } = options;
    const body = { keyword, page, perPage };
    if (subjectType !== undefined) {
        body.subjectType = subjectType;
    }
    const payload = await movieboxPost('/wefeed-h5api-bff/subject/search', body, fetchOpts);
    return parseSearchResponse(payload);
}
export async function getSubjectDetail(detailPath, options) {
    const query = new URLSearchParams({ detailPath });
    const payload = await movieboxGet(`/wefeed-h5api-bff/detail?${query.toString()}`, options);
    return parseDetailResponse(payload);
}
export async function getDownloadLinks(subjectId, season, episode, detailPath, options) {
    const query = new URLSearchParams({
        subjectId,
        se: String(season),
        ep: String(episode),
        detailPath
    });
    const payload = await movieboxGet(`/wefeed-h5api-bff/subject/download?${query.toString()}`, options);
    return parseDownloadResponse(payload);
}
