export * from './types.js';
export { SourceService } from './service.js';

// Export provider classes
export { VidsrcMediaSource } from './providers/vidsrc/index.js';
export { MovieboxMediaSource } from './providers/moviebox/index.js';
export { WcoMediaSource } from './providers/wco/index.js';

// Factory function for creating sources
export type SourceKey = 'vidsrc' | 'moviebox' | 'wco';

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

// Backward compatibility - singleton service instance
import { MediaSource } from './types.js';
import { VidsrcMediaSource } from './providers/vidsrc/index.js';
import { MovieboxMediaSource } from './providers/moviebox/index.js';
import { WcoMediaSource } from './providers/wco/index.js';
import { SourceService } from './service.js';

export const sourceService = new SourceService('vidsrc');
sourceService.registerSource('vidsrc', new VidsrcMediaSource());
sourceService.registerSource('moviebox', new MovieboxMediaSource());
sourceService.registerSource('wco', new WcoMediaSource());
