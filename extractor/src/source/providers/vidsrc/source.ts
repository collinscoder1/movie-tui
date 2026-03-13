import { buildVidsrcUrl, EpisodeDescriptor, fetchSeasonDetails, fetchTmdbMovie, fetchTmdbShow, searchTmdb } from '../../../search.js';
import { extractVidsrcLinks, helpers } from '../../../extractor.js';
import { MediaSource, MediaSourceOptions, MediaType, UrlMediaInfo, SourceMediaInfo, SourceTvSeasonInfo } from '../../types.js';

function normalizeEntries(episodes: Array<{ episode_number: number; name?: string }>): SourceTvSeasonInfo['episodes'] {
  return episodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name }));
}

function buildSeasonInfo(tmdbId: string, title: string, seasonNumber: number, episodes: Array<{ episode_number: number; name?: string }>): SourceTvSeasonInfo {
  return {
    type: 'tv',
    tmdbId,
    title,
    seasonNumber,
    episodes: normalizeEntries(episodes)
  };
}

function buildMovieInfo(tmdbId: string, title: string): SourceMediaInfo {
  return { type: 'movie', tmdbId, title };
}

function describeTvFromSeason(tmdbId: string, title: string, seasonNumber: number, episodes: Array<{ episode_number: number; name?: string }>): SourceTvSeasonInfo {
  return buildSeasonInfo(tmdbId, title, seasonNumber, episodes);
}

function describeMovie(tmdbId: string, title: string): SourceMediaInfo {
  return buildMovieInfo(tmdbId, title);
}

export class VidsrcMediaSource implements MediaSource {
  async searchByName(type: MediaType, query: string) {
    return searchTmdb(type, query);
  }

  async describeFromUrl(url: string): Promise<UrlMediaInfo> {
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

  async describeFromTmdb(type: MediaType, tmdbId: string): Promise<SourceMediaInfo> {
    if (type === 'movie') {
      const data = await fetchTmdbMovie(tmdbId);
      return describeMovie(tmdbId, data.title);
    }
    const show = await fetchTmdbShow(tmdbId);
    return describeTvFromSeason(tmdbId, show.name, 1, []);
  }

  async fetchSeasonEpisodes(tmdbId: string, season: number) {
    const seasonData = await fetchSeasonDetails(tmdbId, season);
    return normalizeEntries(seasonData.episodes);
  }

  async fetchShowDetails(tmdbId: string) {
    return fetchTmdbShow(tmdbId);
  }

  async fetchMovieMetadata(tmdbId: string) {
    return fetchTmdbMovie(tmdbId);
  }

  async fetchDownloads(descriptor: EpisodeDescriptor, options?: MediaSourceOptions) {
    const url = buildVidsrcUrl(descriptor);
    return extractVidsrcLinks(url, options);
  }
}

export function createVidsrcSource(): MediaSource {
  return new VidsrcMediaSource();
}
