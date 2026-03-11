import { select, text, isCancel } from '@clack/prompts';
import { extractVidsrcLinks, helpers } from '../extractor.js';
import { fetchSeasonDetails, fetchTmdbMovie, fetchTmdbShow, searchTmdb } from '../search.js';
import { chooseSeason, chooseEpisodes } from './prompts.js';
export async function buildDescriptors(mode) {
    if (mode === 'url') {
        const value = await text({ message: 'Enter the vidSrc URL:' });
        if (isCancel(value) || !value) {
            throw new Error('Canceled by user.');
        }
        const parsed = helpers.parseVidsrcUrl(value);
        const descriptor = await descriptorFromParsedUrl(parsed, value);
        return descriptor ? [descriptor] : [];
    }
    if (mode === 'tmdb') {
        return await descriptorsFromTmdb();
    }
    if (mode === 'name') {
        return await descriptorsFromNameSearch();
    }
    return [];
}
async function descriptorFromParsedUrl(parsed, originalUrl) {
    const result = await extractVidsrcLinks(originalUrl);
    const title = result.metadata.title;
    const descriptor = {
        type: parsed.type,
        tmdbId: result.tmdbId,
        season: parsed.season,
        episode: parsed.episode,
        description: parsed.type === 'movie'
            ? `${title} (movie)`
            : `${title} S${parsed.season}E${parsed.episode}`,
        title
    };
    return descriptor;
}
async function descriptorsFromTmdb() {
    const mediaType = await select({
        message: 'Is it a movie or TV show?',
        options: [
            { value: 'movie', label: 'Movie' },
            { value: 'tv', label: 'TV show' }
        ]
    });
    if (isCancel(mediaType)) {
        throw new Error('Canceled by user.');
    }
    const idInput = await text({ message: 'Enter the TMDb ID:' });
    if (isCancel(idInput) || !idInput) {
        throw new Error('Canceled by user.');
    }
    return await descriptorsForTmdbSelection(mediaType, idInput.trim());
}
async function descriptorsFromNameSearch() {
    const mediaType = await select({
        message: 'Search for movies or TV shows?',
        options: [
            { value: 'movie', label: 'Movie' },
            { value: 'tv', label: 'TV show' }
        ]
    });
    if (isCancel(mediaType)) {
        throw new Error('Canceled by user.');
    }
    const query = await text({ message: 'Enter name query:' });
    if (isCancel(query) || !query) {
        throw new Error('Canceled by user.');
    }
    const searchResults = await searchTmdb(mediaType, query.trim());
    if (!searchResults.length) {
        throw new Error('No results found for this query.');
    }
    const options = searchResults.map((item) => ({
        value: item,
        label: `${item.title} (${item.year})`
    }));
    const choice = await select({ message: 'Pick a result', options });
    if (isCancel(choice)) {
        throw new Error('Canceled by user.');
    }
    const selection = choice;
    return await descriptorsForTmdbSelection(mediaType, selection.tmdbId);
}
async function descriptorsForTmdbSelection(type, tmdbId) {
    if (type === 'movie') {
        const details = await fetchTmdbMovie(tmdbId);
        return [
            {
                type: 'movie',
                tmdbId,
                season: null,
                episode: null,
                description: `${details.title} (movie)`,
                title: details.title
            }
        ];
    }
    const show = await fetchTmdbShow(tmdbId);
    const seasonNumber = await chooseSeason(show.seasons);
    const seasonData = await fetchSeasonDetails(tmdbId, seasonNumber);
    const availableEpisodes = seasonData.episodes.map((ep) => ep.episode_number);
    const episodes = await chooseEpisodes(availableEpisodes, seasonNumber);
    return episodes.map((episodeNumber) => ({
        type: 'tv',
        tmdbId,
        season: seasonNumber,
        episode: episodeNumber,
        description: `${show.name} S${seasonNumber}E${episodeNumber}`,
        title: show.name
    }));
}
