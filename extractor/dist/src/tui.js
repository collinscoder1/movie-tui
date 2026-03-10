import { intro, select, text, confirm, spinner, outro, isCancel } from '@clack/prompts';
import { extractVidsrcLinks, helpers } from './extractor.js';
import { buildVidsrcUrl, fetchSeasonDetails, fetchTmdbMovie, fetchTmdbShow, parseEpisodeInput, searchTmdb } from './search.js';
const DOWNLOAD_MANAGER_BASE = 'http://localhost:15151';
async function main() {
    intro('vidsrc download manager TUI');
    try {
        const mode = await select({
            message: 'How would you like to locate the media?',
            options: [
                { value: 'url', label: 'Provide a vidSrc URL' },
                { value: 'tmdb', label: 'Lookup by TMDb ID' },
                { value: 'name', label: 'Search by name' }
            ]
        });
        if (isCancel(mode)) {
            outro('Operation canceled.');
            return;
        }
        const descriptors = await buildDescriptors(mode);
        if (!descriptors.length) {
            outro('No episodes selected.');
            return;
        }
        const queueId = await selectQueue();
        const firstDescriptor = descriptors[0];
        console.log('Fetching sample downloads for', firstDescriptor.description);
        const sampleResult = await extractVidsrcLinks(buildVidsrcUrl(firstDescriptor));
        const quality = await promptQuality(sampleResult);
        for (const descriptor of descriptors) {
            console.log(`Processing ${descriptor.description} ...`);
            const result = descriptor === firstDescriptor
                ? sampleResult
                : await extractVidsrcLinks(buildVidsrcUrl(descriptor));
            const entry = findDownloadForQuality(result, quality);
            if (!entry) {
                console.log('  No download entry matched, skipping.');
                continue;
            }
            const downloadPage = buildVidsrcUrl(descriptor);
            const loader = spinner();
            loader.start('Queueing download');
            try {
                await sendToDownloadManager(entry.url, downloadPage, queueId, descriptor.description);
                loader.stop('Queued');
            }
            catch (error) {
                loader.stop('Failed');
                console.log('  Error sending to download manager:', error instanceof Error ? error.message : error);
            }
        }
        outro('Download requests submitted.');
    }
    catch (error) {
        outro(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function buildDescriptors(mode) {
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
async function descriptorFromParsedUrl(parsed, originalUrl) {
    const result = await extractVidsrcLinks(originalUrl);
    const descriptor = {
        type: parsed.type,
        tmdbId: result.tmdbId,
        imdbId: parsed.imdbId,
        season: parsed.season,
        episode: parsed.episode,
        description: parsed.type === 'movie'
            ? `${result.metadata.title} (movie)`
            : `${result.metadata.title} S${parsed.season}E${parsed.episode}`
    };
    return descriptor;
}
async function descriptorsFromTmdb() {
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
    return await descriptorsForTmdbSelection(mediaType, idInput.trim());
}
async function descriptorsFromNameSearch() {
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
    const searchResults = await searchTmdb(mediaType, query.trim());
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
    const selection = choice;
    return await descriptorsForTmdbSelection(mediaType, selection.tmdbId);
}
async function descriptorsForTmdbSelection(type, tmdbId) {
    if (type === 'movie') {
        const details = await fetchTmdbMovie(tmdbId);
        const imdbId = details.imdb_id;
        if (!imdbId) {
            throw new Error('Movie does not expose an IMDb identifier.');
        }
        return [
            {
                type: 'movie',
                tmdbId,
                imdbId,
                season: null,
                episode: null,
                description: `${details.title} (movie)`
            }
        ];
    }
    const show = await fetchTmdbShow(tmdbId);
    const imdbId = show.imdb_id;
    if (!imdbId) {
        throw new Error('TV show does not expose an IMDb identifier.');
    }
    const seasonNumber = await chooseSeason(show.seasons);
    const seasonData = await fetchSeasonDetails(tmdbId, seasonNumber);
    const availableEpisodes = seasonData.episodes.map((ep) => ep.episode_number);
    const episodes = await chooseEpisodes(availableEpisodes, seasonNumber);
    return episodes.map((episodeNumber) => ({
        type: 'tv',
        tmdbId,
        imdbId,
        season: seasonNumber,
        episode: episodeNumber,
        description: `${show.name} S${seasonNumber}E${episodeNumber}`
    }));
}
async function chooseSeason(seasons) {
    const viable = seasons.filter((s) => s.season_number > 0);
    if (!viable.length) {
        throw new Error('No seasons available to select.');
    }
    const selection = await select({
        message: 'Select a season:',
        options: viable.map((season) => ({
            value: season.season_number,
            label: `Season ${season.season_number} (${season.episode_count ?? 'unknown'} episodes)`
        }))
    });
    if (isCancel(selection)) {
        throw new Error('Canceled by user.');
    }
    return selection;
}
async function chooseEpisodes(available, season) {
    const all = await confirm({ message: `Download all episodes of Season ${season}?` });
    if (isCancel(all)) {
        throw new Error('Canceled by user.');
    }
    if (all) {
        return available;
    }
    const raw = await text({ message: 'Enter episodes (e.g. 1-3,5)' });
    if (isCancel(raw) || !raw) {
        throw new Error('Canceled by user.');
    }
    const parsed = parseEpisodeInput(raw, available);
    if (!parsed.length) {
        throw new Error('No valid episodes specified.');
    }
    return parsed;
}
async function promptQuality(result) {
    const options = [];
    const seen = new Set();
    for (const [format, entries] of Object.entries(result.downloads)) {
        for (const entry of entries) {
            const resolutionKey = entry.resolution ?? 'any';
            const key = `${format}|${resolutionKey}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            options.push({
                label: `${format} ${resolutionKey} · ${entry.size}`,
                value: { format, resolution: entry.resolution }
            });
        }
    }
    if (!options.length) {
        throw new Error('No downloads available to choose a quality.');
    }
    const choice = await select({ message: 'Choose download quality:', options });
    if (isCancel(choice)) {
        throw new Error('Canceled by user.');
    }
    return choice;
}
function findDownloadForQuality(result, quality) {
    const entries = result.downloads[quality.format] ?? [];
    const resolutionKey = quality.resolution ?? null;
    const matched = entries.find((entry) => (entry.resolution ?? null) === resolutionKey);
    if (matched) {
        return matched;
    }
    return entries[0] ?? null;
}
async function selectQueue() {
    try {
        const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/queues`);
        if (!response.ok) {
            return null;
        }
        const queues = await response.json();
        if (!queues?.length) {
            return null;
        }
        const choice = await select({
            message: 'Select a queue (leave default for automatic):',
            options: [{ value: null, label: 'Default queue (auto)' }, ...queues.map((queue) => ({ value: queue.id, label: queue.name }))]
        });
        if (isCancel(choice)) {
            return null;
        }
        return choice;
    }
    catch {
        return null;
    }
}
async function sendToDownloadManager(link, downloadPage, queueId, name) {
    const payload = {
        downloadSource: {
            link,
            downloadPage
        }
    };
    if (queueId !== null) {
        payload.queueId = queueId;
    }
    if (name) {
        payload.name = name;
    }
    const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/start-headless-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Download manager returned ${response.status}`);
    }
}
if (import.meta.main) {
    main();
}
