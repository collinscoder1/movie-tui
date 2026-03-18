const TMDB_API_KEY = '54e00466a09676df57ba51c4ca30b1a6';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
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
    const data = await response.json();
    return { title: data.title };
}
export async function fetchTmdbShow(id) {
    const response = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`);
    if (!response.ok) {
        throw new Error('Failed to fetch show details.');
    }
    const data = await response.json();
    return {
        name: data.name,
        seasons: data.seasons || []
    };
}
export async function fetchSeasonDetails(id, seasonNumber) {
    const response = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
    if (!response.ok) {
        throw new Error('Failed to fetch season details.');
    }
    return response.json();
}
export async function resolveTmdbIdFromImdb(imdbId, type, fetchImpl = globalThis.fetch) {
    if (!imdbId.startsWith('tt')) {
        return null;
    }
    const response = await fetchImpl(`${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&language=en-US&external_source=imdb_id`);
    const payload = await response.json();
    if (type === 'movie') {
        return payload.movie_results?.[0]?.id?.toString() ?? null;
    }
    return payload.tv_results?.[0]?.id?.toString() ?? null;
}
