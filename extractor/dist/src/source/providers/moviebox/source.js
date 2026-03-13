import { getDownloadLinks, getSubjectDetail, searchSubjects } from '../../../moviebox/index.js';
const subjectTypeMap = {
    movie: 1,
    tv: 2
};
function parseReleaseYear(value) {
    if (!value)
        return 'unknown';
    const match = value.split('-')[0];
    return match || 'unknown';
}
function seasonToEpisodes(season) {
    return season.episodes.map(ep => ({
        episode_number: ep.episode,
        name: ep.title
    }));
}
function detailToSourceMedia(detail) {
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
function groupDownloads(entries) {
    return entries.reduce((acc, entry) => {
        const bucket = entry.format || 'Other';
        if (!acc[bucket]) {
            acc[bucket] = [];
        }
        acc[bucket].push(entry);
        return acc;
    }, {});
}
function movieboxDownloadResultToExtraction(descriptor, result) {
    const episodeTitle = descriptor.metadata?.episodeTitle ?? `Episode ${descriptor.episode ?? 0}`;
    const releaseDate = String(descriptor.metadata?.releaseDate ?? 'Unknown');
    const year = parseReleaseYear(releaseDate);
    const metadata = descriptor.type === 'movie'
        ? { title: descriptor.title, year }
        : { title: descriptor.title, year, episodeTitle, releaseDate };
    const downloads = result.downloads.map((entry) => ({
        format: entry.format,
        resolution: entry.resolution ?? null,
        size: entry.size ?? 'Unknown',
        url: entry.url
    }));
    const subtitles = result.subtitles.map((subtitle) => ({
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
function buildShowDetails(detail) {
    return {
        name: detail.title,
        seasons: detail.seasons.map((season) => ({
            season_number: season.seasonNumber,
            episode_count: season.episodes.length
        }))
    };
}
// Default client implementation
const defaultClient = {
    searchSubjects,
    getSubjectDetail,
    getDownloadLinks
};
export class MovieboxMediaSource {
    constructor(client = defaultClient) {
        this.client = client;
    }
    async searchByName(type, query) {
        const subjectType = subjectTypeMap[type];
        const payload = await this.client.searchSubjects({ keyword: query, subjectType });
        return payload.items.map((item) => ({
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
    async describeFromUrl() {
        throw new Error('Moviebox URLs are not supported yet');
    }
    async describeFromTmdb(type, tmdbId) {
        const detail = await this.client.getSubjectDetail(tmdbId);
        return detailToSourceMedia(detail);
    }
    async fetchSeasonEpisodes(tmdbId, season) {
        const detail = await this.client.getSubjectDetail(tmdbId);
        const matched = detail.seasons.find((s) => s.seasonNumber === season);
        return matched ? seasonToEpisodes(matched) : [];
    }
    async fetchShowDetails(tmdbId) {
        const detail = await this.client.getSubjectDetail(tmdbId);
        return buildShowDetails(detail);
    }
    async fetchMovieMetadata(tmdbId) {
        const detail = await this.client.getSubjectDetail(tmdbId);
        return { title: detail.title };
    }
    async fetchDownloads(descriptor, options) {
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
export function createMovieboxSource(client) {
    return new MovieboxMediaSource(client);
}
