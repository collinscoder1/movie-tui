const TMDB_API_KEY = '54e00466a09676df57ba51c4ca30b1a6';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export function parseEpisodeInput(value, available) {
    const normalized = value
        .split(',')
        .flatMap((part) => {
        const trimmed = part.trim();
        if (!trimmed) {
            return [];
        }
        if (trimmed.includes('-')) {
            const [startRaw, endRaw] = trimmed.split('-');
            const start = Number(startRaw.trim());
            const end = Number(endRaw.trim());
            if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
                return [];
            }
            return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
        }
        const num = Number(trimmed);
        return Number.isFinite(num) ? [num] : [];
    })
        .filter((num) => available.includes(num));
    return Array.from(new Set(normalized)).sort((a, b) => a - b);
}
export async function searchTmdb(type, query) {
    const target = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`${TMDB_BASE_URL}/search/${target}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
    if (!response.ok) {
        throw new Error('TMDb search failed.');
    }
    const payload = await response.json();
    if (!payload.results?.length) {
        return [];
    }
    return payload.results.slice(0, 8).map((item) => ({
        tmdbId: item.id?.toString() ?? '',
        title: type === 'movie' ? item.title : item.name,
        year: (type === 'movie' ? item.release_date : item.first_air_date)?.split('-')[0] ?? 'unknown'
    }));
}
export async function fetchTmdbMovie(id) {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    if (!response.ok) {
        throw new Error('Failed to fetch movie details.');
    }
    return response.json();
}
export async function fetchTmdbShow(id) {
    const response = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    if (!response.ok) {
        throw new Error('Failed to fetch show details.');
    }
    return response.json();
}
export async function fetchSeasonDetails(id, seasonNumber) {
    const response = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
    if (!response.ok) {
        throw new Error('Failed to fetch season details.');
    }
    return response.json();
}
export function buildVidsrcUrl(descriptor) {
    if (descriptor.type === 'movie') {
        return `https://dl.vidsrc.vip/movie/${descriptor.imdbId}`;
    }
    return `https://dl.vidsrc.vip/tv/${descriptor.imdbId}/${descriptor.season}/${descriptor.episode}`;
}
