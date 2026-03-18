export function buildVidsrcUrl(descriptor) {
    if (descriptor.type === 'movie') {
        return `https://dl.vidsrc.vip/movie/tmdb-${descriptor.tmdbId}`;
    }
    return `https://dl.vidsrc.vip/tv/tmdb-${descriptor.tmdbId}/${descriptor.season}/${descriptor.episode}`;
}
