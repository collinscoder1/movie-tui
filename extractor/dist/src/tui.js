import { intro, select, text, confirm, spinner, outro, isCancel } from '@clack/prompts';
import { extractVidsrcLinks, helpers } from './extractor.js';
import { buildVidsrcUrl, fetchSeasonDetails, fetchTmdbMovie, fetchTmdbShow, parseEpisodeInput, searchTmdb } from './search.js';
import { sendToDownloadManager, DOWNLOAD_MANAGER_BASE } from './download-manager.js';
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
        const prefs = await collectPreferences(descriptors[0]);
        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        for (const descriptor of descriptors) {
            console.log(`\nProcessing ${descriptor.description} ...`);
            const result = await processDescriptor(descriptor, queueId, prefs);
            if (result === 'success')
                successCount++;
            else if (result === 'fail')
                failCount++;
            else
                skipCount++;
        }
        console.log(`\n=== Summary: ${successCount} queued, ${failCount} failed, ${skipCount} skipped ===`);
        outro('Download requests submitted.');
    }
    catch (error) {
        outro(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function collectPreferences(firstDescriptor) {
    console.log('\nFetching sample to check available options...');
    let sampleResult = null;
    try {
        sampleResult = await extractVidsrcLinks(buildVidsrcUrl(firstDescriptor));
    }
    catch {
        console.log('Could not fetch sample, will prompt per-episode.');
    }
    const subtitleLanguage = await selectSubtitleLanguage(sampleResult);
    const qualityPreference = await selectQualityPreference(sampleResult);
    return { subtitleLanguage, qualityPreference };
}
async function selectSubtitleLanguage(sampleResult) {
    const languages = sampleResult?.subtitles.map(s => s.lanName) ?? [];
    const uniqueLanguages = [...new Set(languages)];
    if (uniqueLanguages.length === 0) {
        const wantSubs = await confirm({ message: 'No subtitles found. Try to download subtitles anyway?' });
        if (!wantSubs || isCancel(wantSubs)) {
            return null;
        }
        const customLang = await text({ message: 'Enter preferred subtitle language (e.g., English):' });
        if (isCancel(customLang) || !customLang) {
            return null;
        }
        return customLang;
    }
    const options = [
        { value: null, label: 'No subtitles' },
        ...uniqueLanguages.map(lang => ({ value: lang, label: lang }))
    ];
    const choice = await select({ message: 'Select subtitle language:', options });
    if (isCancel(choice)) {
        return null;
    }
    return choice;
}
async function selectQualityPreference(sampleResult) {
    const allEntries = sampleResult ? Object.values(sampleResult.downloads).flat() : [];
    const availableFormats = [...new Set(allEntries.map(e => e.format))];
    let selectedFormat;
    if (availableFormats.length === 0) {
        selectedFormat = 'any';
    }
    else if (availableFormats.length === 1) {
        selectedFormat = availableFormats[0];
        console.log(`Only one format available: ${selectedFormat}`);
    }
    else {
        const formatChoice = await select({
            message: 'Select preferred format:',
            options: [
                ...availableFormats.map(f => ({ value: f, label: f })),
                { value: 'any', label: 'Any format' }
            ]
        });
        if (isCancel(formatChoice)) {
            selectedFormat = 'any';
        }
        else {
            selectedFormat = formatChoice;
        }
    }
    const resolutionChoice = await select({
        message: 'Select preferred resolution:',
        options: [
            { value: '1080', label: '1080p (Full HD)' },
            { value: '720', label: '720p (HD)' },
            { value: '480', label: '480p (SD)' },
            { value: '360', label: '360p (Low)' },
            { value: 'auto', label: 'Auto (best available)' }
        ]
    });
    const selectedResolution = isCancel(resolutionChoice) ? 'auto' : resolutionChoice;
    return {
        format: selectedFormat,
        resolution: selectedResolution === 'auto' ? null : selectedResolution
    };
}
async function processDescriptor(descriptor, queueId, prefs) {
    let result;
    try {
        result = await extractVidsrcLinks(buildVidsrcUrl(descriptor));
    }
    catch (error) {
        console.log(`  Extraction failed: ${error instanceof Error ? error.message : error}`);
        return 'fail';
    }
    if (Object.keys(result.downloads).length === 0) {
        console.log('  No downloads available for this content.');
        return 'skip';
    }
    const entry = await selectQualityForEpisode(result, prefs.qualityPreference);
    if (!entry) {
        console.log('  No suitable quality selected, skipping.');
        return 'skip';
    }
    const downloadPage = buildVidsrcUrl(descriptor);
    const loader = spinner();
    loader.start('Queueing download');
    try {
        await sendToDownloadManager(entry, downloadPage, queueId, descriptor.description);
        if (prefs.subtitleLanguage) {
            const subtitle = result.subtitles.find(s => s.lanName === prefs.subtitleLanguage);
            if (subtitle) {
                const subEntry = {
                    format: 'SRT',
                    resolution: null,
                    size: subtitle.size,
                    url: subtitle.url
                };
                await sendToDownloadManager(subEntry, downloadPage, queueId, `${descriptor.description} - ${prefs.subtitleLanguage} subtitle`);
                console.log(`  Subtitle (${prefs.subtitleLanguage}) queued`);
            }
            else {
                console.log(`  Subtitle (${prefs.subtitleLanguage}) not available, skipped`);
            }
        }
        loader.stop('Queued');
        return 'success';
    }
    catch (error) {
        loader.stop('Failed');
        console.log('  Error sending to download manager:', error instanceof Error ? error.message : error);
        return 'fail';
    }
}
async function selectQualityForEpisode(result, preference) {
    const allEntries = Object.values(result.downloads).flat();
    if (allEntries.length === 0) {
        return null;
    }
    const formatFilter = preference.format === 'any' ? null : preference.format;
    const resolutionFilter = preference.resolution;
    if (resolutionFilter === null) {
        // Auto resolution
        const candidates = formatFilter
            ? allEntries.filter(e => e.format === formatFilter)
            : allEntries;
        const bestEntry = findBestQuality(candidates.length > 0 ? candidates : allEntries);
        if (bestEntry) {
            console.log(`  Auto-selected: ${bestEntry.format} ${bestEntry.resolution || 'any'} (${bestEntry.size})`);
        }
        return bestEntry;
    }
    // Specific resolution requested
    const candidates = formatFilter
        ? allEntries.filter(e => e.format === formatFilter && e.resolution?.startsWith(resolutionFilter))
        : allEntries.filter(e => e.resolution?.startsWith(resolutionFilter));
    if (candidates.length > 0) {
        const entry = candidates[0];
        console.log(`  Found ${formatFilter || 'any'} ${resolutionFilter}p: ${entry.format} ${entry.resolution} (${entry.size})`);
        return entry;
    }
    // Not found - need to re-prompt with all available
    const targetDesc = formatFilter ? `${formatFilter} ${resolutionFilter}p` : `${resolutionFilter}p`;
    console.log(`  ${targetDesc} not available for this episode`);
    return await promptForAvailableQuality(allEntries);
}
function findBestQuality(entries) {
    const resolutionPriority = ['1080', '720', '480', '360'];
    for (const res of resolutionPriority) {
        const match = entries.find(e => e.resolution?.startsWith(res));
        if (match)
            return match;
    }
    return entries[0] ?? null;
}
async function promptForAvailableQuality(entries) {
    const options = entries.map(entry => ({
        label: `${entry.format} ${entry.resolution || 'unknown'} · ${entry.size}`,
        value: entry
    }));
    const choice = await select({
        message: 'Choose from available qualities:',
        options
    });
    if (isCancel(choice)) {
        return null;
    }
    return choice;
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
        return [
            {
                type: 'movie',
                tmdbId,
                season: null,
                episode: null,
                description: `${details.title} (movie)`
            }
        ];
    }
    const show = await fetchTmdbShow(tmdbId);
    const seasonNumber = await chooseSeason(show.seasons);
    const seasonData = await fetchSeasonDetails(tmdbId, seasonNumber);
    const availableEpisodes = seasonData.episodes.map((ep) => ep.episode_number);
    const episodes = await chooseEpisodes(availableEpisodes, seasonNumber);
    return episodes.map((episodeNumber) => ({
        type: 'tv',
        tmdbId,
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
main();
