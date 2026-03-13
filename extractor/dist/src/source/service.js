export class SourceService {
    constructor(defaultKey) {
        this.providers = new Map();
        this.activeKey = defaultKey;
    }
    registerSource(key, source) {
        this.providers.set(key, source);
    }
    getAvailableSources() {
        return Array.from(this.providers.keys());
    }
    useSource(key) {
        if (!this.providers.has(key)) {
            throw new Error(`Media source not registered: ${key}`);
        }
        this.activeKey = key;
    }
    describeFromUrl(url, key) {
        return this.resolveSource(key).describeFromUrl(url);
    }
    searchByName(type, query, key) {
        return this.resolveSource(key).searchByName(type, query);
    }
    describeFromTmdb(type, tmdbId, key) {
        return this.resolveSource(key).describeFromTmdb(type, tmdbId);
    }
    fetchSeasonEpisodes(tmdbId, season, key) {
        return this.resolveSource(key).fetchSeasonEpisodes(tmdbId, season);
    }
    fetchShowDetails(tmdbId, key) {
        return this.resolveSource(key).fetchShowDetails(tmdbId);
    }
    fetchMovieMetadata(tmdbId, key) {
        return this.resolveSource(key).fetchMovieMetadata(tmdbId);
    }
    fetchDownloads(descriptor, options) {
        const sourceKey = descriptor.source ?? this.activeKey;
        return this.resolveSource(sourceKey).fetchDownloads(descriptor, options);
    }
    resolveSource(key) {
        const lookup = key ?? this.activeKey;
        const source = this.providers.get(lookup);
        if (!source) {
            throw new Error(`No media source registered under "${lookup}"`);
        }
        return source;
    }
}
