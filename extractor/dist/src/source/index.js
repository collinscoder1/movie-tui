export * from './types.js';
export { SourceService } from './service.js';
// Export provider classes
export { VidsrcMediaSource } from './providers/vidsrc/index.js';
export { MovieboxMediaSource } from './providers/moviebox/index.js';
export function createSource(key) {
    switch (key) {
        case 'vidsrc':
            return new VidsrcMediaSource();
        case 'moviebox':
            return new MovieboxMediaSource();
        default:
            throw new Error(`Unknown source: ${key}`);
    }
}
import { VidsrcMediaSource } from './providers/vidsrc/index.js';
import { MovieboxMediaSource } from './providers/moviebox/index.js';
import { SourceService } from './service.js';
export const sourceService = new SourceService('vidsrc');
sourceService.registerSource('vidsrc', new VidsrcMediaSource());
sourceService.registerSource('moviebox', new MovieboxMediaSource());
