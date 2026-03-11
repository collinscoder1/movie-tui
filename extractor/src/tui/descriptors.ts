import { select, text, isCancel } from '@clack/prompts';
import { extractVidsrcLinks, helpers, VidSrcType } from '../extractor.js';
import {
  EpisodeDescriptor,
  SearchResult,
  buildVidsrcUrl,
  fetchSeasonDetails,
  fetchTmdbMovie,
  fetchTmdbShow,
  searchTmdb
} from '../search.js';
import { chooseSeason, chooseEpisodes } from './prompts.js';

export async function buildDescriptors(mode: 'url' | 'tmdb' | 'name'): Promise<EpisodeDescriptor[]> {
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

async function descriptorFromParsedUrl(
  parsed: ReturnType<typeof helpers.parseVidsrcUrl>,
  originalUrl: string
): Promise<EpisodeDescriptor | null> {
  const result = await extractVidsrcLinks(originalUrl);
  const descriptor: EpisodeDescriptor = {
    type: parsed.type,
    tmdbId: result.tmdbId,
    season: parsed.season,
    episode: parsed.episode,
    description:
      parsed.type === 'movie'
        ? `${result.metadata.title} (movie)`
        : `${(result.metadata as { title: string }).title} S${parsed.season}E${parsed.episode}`
  };
  return descriptor;
}

async function descriptorsFromTmdb(): Promise<EpisodeDescriptor[]> {
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
  return await descriptorsForTmdbSelection(mediaType as VidSrcType, idInput.trim());
}

async function descriptorsFromNameSearch(): Promise<EpisodeDescriptor[]> {
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
  const searchResults = await searchTmdb(mediaType as VidSrcType, query.trim());
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
  const selection = choice as SearchResult;
  return await descriptorsForTmdbSelection(mediaType as VidSrcType, selection.tmdbId);
}

async function descriptorsForTmdbSelection(type: VidSrcType, tmdbId: string): Promise<EpisodeDescriptor[]> {
  if (type === 'movie') {
    const details = await fetchTmdbMovie(tmdbId);
    return [
      {
        type: 'movie',
        tmdbId,
        season: null,
        episode: null,
        description: `${details.title} (movie)`
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
    description: `${show.name} S${seasonNumber}E${episodeNumber}`
  }));
}
