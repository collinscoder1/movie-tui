import { select, text, isCancel } from '@clack/prompts';
import { sourceService } from '../source/index.js';
import { chooseSeason, chooseEpisodes } from './prompts.js';
export async function buildDescriptors(mode) {
    if (mode === 'url') {
        const value = await text({ message: 'Enter the vidSrc URL:' });
        if (isCancel(value) || !value) {
            throw new Error('Canceled by user.');
        }
        const info = await sourceService.describeFromUrl(value);
        return [descriptorFromMediaInfo(info)];
    }
    if (mode === 'tmdb') {
        return await descriptorsFromTmdb();
    }
    if (mode === 'name') {
        return await descriptorsFromNameSearch();
    }
    return [];
}
function descriptorFromMediaInfo(info) {
    if (info.type === 'movie') {
        return {
            source: 'vidsrc',
            type: 'movie',
            tmdbId: info.tmdbId,
            season: null,
            episode: null,
            description: `${info.title} (movie)`,
            title: info.title,
            metadata: info.metadata
        };
    }
    const seasonDesc = info.season ?? info.seasonNumber ?? 1;
    const episodeDesc = info.episode ?? 1;
    return {
        source: 'vidsrc',
        type: 'tv',
        tmdbId: info.tmdbId,
        season: seasonDesc,
        episode: episodeDesc,
        description: `${info.title} S${seasonDesc}E${episodeDesc}`,
        title: info.title,
        metadata: info.metadata
    };
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
    const searchResults = await sourceService.searchByName(mediaType, query.trim());
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
        const details = await sourceService.fetchMovieMetadata(tmdbId);
        return [
            {
                source: 'vidsrc',
                type: 'movie',
                tmdbId,
                season: null,
                episode: null,
                description: `${details.title} (movie)`,
                title: details.title
            }
        ];
    }
    const show = await sourceService.fetchShowDetails(tmdbId);
    const seasonNumber = await chooseSeason(show.seasons);
    const episodes = await sourceService.fetchSeasonEpisodes(tmdbId, seasonNumber);
    const availableEpisodes = episodes.map((ep) => ep.episode_number);
    const episodeTitles = new Map();
    for (const ep of episodes) {
        if (ep.name) {
            episodeTitles.set(ep.episode_number, ep.name);
        }
    }
    const selected = await chooseEpisodes(availableEpisodes, seasonNumber, episodeTitles);
    return selected.map((episodeNumber) => ({
        source: 'vidsrc',
        type: 'tv',
        tmdbId,
        season: seasonNumber,
        episode: episodeNumber,
        description: `${show.name} S${seasonNumber}E${episodeNumber}`,
        title: show.name
    }));
}
