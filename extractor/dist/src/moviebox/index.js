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
function buildEpisodes(season, subject) {
    const countCandidates = [];
    if (typeof season.maxEp === 'number' && season.maxEp > 0) {
        countCandidates.push(season.maxEp);
    }
    if (Array.isArray(season.resolutions)) {
        const maxFromRes = season.resolutions.reduce((acc, item) => Math.max(acc, Number(item?.epNum ?? 0)), 0);
        if (maxFromRes > 0) {
            countCandidates.push(maxFromRes);
        }
    }
    const count = countCandidates.length > 0 ? Math.max(...countCandidates) : 0;
    const episodes = [];
    const total = count > 0 ? count : 1;
    const seasonNumber = season.se ?? season.season ?? season.seasonNum ?? 1;
    for (let idx = 1; idx <= total; idx += 1) {
        episodes.push({
            season: seasonNumber,
            episode: idx,
            detailPath: subject.detailPath,
            subjectId: subject.subjectId
        });
    }
    return episodes;
}
export function parseDetailResponse(payload) {
    const subject = payload.data.subject;
    const seasons = [];
    const rawSeasons = subject.resource?.seasons ?? [];
    for (const raw of rawSeasons) {
        seasons.push({
            seasonNumber: raw.se ?? raw.season ?? raw.seasonNum ?? 1,
            episodes: buildEpisodes(raw, subject)
        });
    }
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
