export * from './types.js';
export { SourceService } from './service.js';

export { VidsrcMediaSource, createVidsrcSource, extractVidsrcLinks, helpers, parseVidsrcUrl, buildVidsrcUrl } from './providers/vidsrc/index.js';
export { MovieboxMediaSource, createMovieboxSource } from './providers/moviebox/index.js';
export { WcoMediaSource, createWcoSource } from './providers/wco/index.js';

export { searchTmdb, fetchTmdbMovie, fetchTmdbShow, fetchSeasonDetails, resolveTmdbIdFromImdb } from './tmdb.js';
export { parseEpisodeInput } from './utils/episode-parser.js';

export type SourceKey = 'vidsrc' | 'moviebox' | 'wco';

import { MediaSource } from './types.js';
import { VidsrcMediaSource } from './providers/vidsrc/index.js';
import { MovieboxMediaSource } from './providers/moviebox/index.js';
import { WcoMediaSource } from './providers/wco/index.js';
import { SourceService } from './service.js';

export function createSource(key: SourceKey): MediaSource {
  switch (key) {
    case 'vidsrc':
      return new VidsrcMediaSource();
    case 'moviebox':
      return new MovieboxMediaSource();
    case 'wco':
      return new WcoMediaSource();
    default:
      throw new Error(`Unknown source: ${key}`);
  }
}

export const sourceService = new SourceService('vidsrc');
sourceService.registerSource('vidsrc', new VidsrcMediaSource());
sourceService.registerSource('moviebox', new MovieboxMediaSource());
sourceService.registerSource('wco', new WcoMediaSource());
