export * from './types.js';
export { SourceService } from './service.js';
import { createMovieboxSource } from './providers/moviebox/index.js';
import { createVidsrcSource } from './providers/vidsrc/index.js';
import { SourceService } from './service.js';
export const sourceService = new SourceService('vidsrc');
sourceService.registerSource('vidsrc', createVidsrcSource());
sourceService.registerSource('moviebox', createMovieboxSource());
