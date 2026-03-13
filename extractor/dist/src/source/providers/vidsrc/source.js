import { buildVidsrcUrl, fetchSeasonDetails, fetchTmdbMovie, fetchTmdbShow, searchTmdb } from '../../../search.js';
import { extractVidsrcLinks, helpers } from '../../../extractor.js';
function normalizeEntries(episodes) {
    return episodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name }));
}
function buildSeasonInfo(tmdbId, title, seasonNumber, episodes) {
    return {
        type: 'tv',
        tmdbId,
        title,
        seasonNumber,
        episodes: normalizeEntries(episodes)
    };
}
function buildMovieInfo(tmdbId, title) {
    return { type: 'movie', tmdbId, title };
}
function describeTvFromSeason(tmdbId, title, seasonNumber, episodes) {
    return buildSeasonInfo(tmdbId, title, seasonNumber, episodes);
}
function describeMovie(tmdbId, title) {
    return buildMovieInfo(tmdbId, title);
}
export class VidsrcMediaSource {
    async searchByName(type, query) {
        return searchTmdb(type, query);
    }
    async describeFromUrl(url) {
        const parsed = helpers.parseVidsrcUrl(url);
        const result = await extractVidsrcLinks(url);
        if (parsed.type === 'movie') {
            return {
                ...describeMovie(result.tmdbId, result.metadata.title),
                url,
                season: null,
                episode: null
            };
        }
        const seasonNumber = parsed.season ?? 1;
        const seasonData = await fetchSeasonDetails(result.tmdbId, seasonNumber);
        return {
            ...describeTvFromSeason(result.tmdbId, result.metadata.title, seasonNumber, seasonData.episodes),
            url,
            season: seasonNumber,
            episode: parsed.episode ?? null
        };
    }
    async describeFromTmdb(type, tmdbId) {
        if (type === 'movie') {
            const data = await fetchTmdbMovie(tmdbId);
            return describeMovie(tmdbId, data.title);
        }
        const show = await fetchTmdbShow(tmdbId);
        return describeTvFromSeason(tmdbId, show.name, 1, []);
    }
    async fetchSeasonEpisodes(tmdbId, season) {
        const seasonData = await fetchSeasonDetails(tmdbId, season);
        return normalizeEntries(seasonData.episodes);
    }
    async fetchShowDetails(tmdbId) {
        return fetchTmdbShow(tmdbId);
    }
    async fetchMovieMetadata(tmdbId) {
        return fetchTmdbMovie(tmdbId);
    }
    async fetchDownloads(descriptor, options) {
        const url = buildVidsrcUrl(descriptor);
        return extractVidsrcLinks(url, options);
    }
}
export function createVidsrcSource() {
    return new VidsrcMediaSource();
}
