import { intro, outro, isCancel, select, confirm, text } from '@clack/prompts';
import { selectQueue, selectSubtitleLanguage, selectQualityPreference, selectDownloadPath, chooseSeason } from './prompts.js';
import { processDescriptor } from './downloads.js';
import { loadDefaultConfig, loadConfig, listConfigs, saveConfig, setDefaultConfig, validateDownloadPath } from '../config.js';
import { runConfigTui } from './config-tui.js';
import { checkExistingDownloads, formatVerificationResults } from './file-checker.js';
import { fetchTmdbMovie, fetchTmdbShow, fetchSeasonDetails, searchTmdb } from '../search.js';
import { extractVidsrcLinks, helpers } from '../extractor.js';
import { multiselect } from '@clack/prompts';
import { parseEpisodeInput } from '../search.js';
async function main() {
    intro('vidsrc download manager TUI');
    try {
        // STEP 1: Config Selection (BLOCKING - must have downloadPath)
        const config = await selectConfigBlocking();
        if (!config || !config.downloadPath) {
            outro('Configuration with download path required. Please create a configuration first.');
            return;
        }
        // STEP 2: Show selected config
        console.log(`\nUsing configuration: ${config.name}`);
        console.log(`  Download path: ${config.downloadPath}`);
        console.log(`  Subtitle: ${config.subtitleLanguage ?? 'none'}`);
        console.log(`  Format: ${config.preferredFormat}`);
        console.log(`  Resolution: ${config.preferredResolution}`);
        // STEP 3: Convert to prefs
        const prefs = configToPrefs(config);
        const baseFolder = config.downloadPath;
        // STEP 4: Media search
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
        // STEP 5: Get season/show info (not individual episodes yet)
        const seasonInfo = await getSeasonInfo(mode);
        if (!seasonInfo) {
            outro('No media selected.');
            return;
        }
        // Handle movies differently - they're simple
        if (seasonInfo.type === 'movie') {
            const descriptor = {
                type: 'movie',
                tmdbId: seasonInfo.tmdbId,
                season: null,
                episode: null,
                description: `${seasonInfo.title} (movie)`,
                title: seasonInfo.title
            };
            // For movies, just ask what to do
            const action = await selectMovieAction();
            if (action === 'verify') {
                console.log('\nChecking existing downloads...');
                const { downloaded } = await checkExistingDownloads([descriptor], baseFolder);
                console.log(formatVerificationResults([descriptor], downloaded));
                outro('Done.');
                return;
            }
            // Download or Undownloaded
            let descriptorsToProcess = [descriptor];
            if (action === 'undownloaded') {
                const { missing } = await checkExistingDownloads([descriptor], baseFolder);
                if (missing.length === 0) {
                    console.log('\nMovie already downloaded!');
                    outro('Done.');
                    return;
                }
                console.log('\nMovie not downloaded. Queuing...');
                descriptorsToProcess = missing;
            }
            await processDownloads(descriptorsToProcess, prefs, baseFolder);
            return;
        }
        // STEP 6: For TV shows - Select action first
        const action = await selectTvAction();
        if (action === 'verify') {
            // Build all episode descriptors
            const descriptors = seasonInfo.episodes.map(ep => ({
                type: 'tv',
                tmdbId: seasonInfo.tmdbId,
                season: seasonInfo.seasonNumber,
                episode: ep.episode_number,
                description: `${seasonInfo.title} S${seasonInfo.seasonNumber}E${ep.episode_number}`,
                title: seasonInfo.title
            }));
            console.log('\nChecking existing downloads...');
            const { downloaded } = await checkExistingDownloads(descriptors, baseFolder);
            console.log(formatVerificationResults(descriptors, downloaded));
            outro('Done.');
            return;
        }
        // STEP 7: Select episodes (for download or undownloaded)
        const selectedEpisodes = await selectEpisodesFromSeason(seasonInfo);
        if (selectedEpisodes.length === 0) {
            outro('No episodes selected.');
            return;
        }
        // Build descriptors for selected episodes
        let descriptors = selectedEpisodes.map(ep => ({
            type: 'tv',
            tmdbId: seasonInfo.tmdbId,
            season: seasonInfo.seasonNumber,
            episode: ep.episode_number,
            description: `${seasonInfo.title} S${seasonInfo.seasonNumber}E${ep.episode_number}`,
            title: seasonInfo.title
        }));
        // STEP 8: Handle undownloaded action
        if (action === 'undownloaded') {
            const { missing } = await checkExistingDownloads(descriptors, baseFolder);
            if (missing.length === 0) {
                console.log('\nAll selected episodes already downloaded!');
                outro('Done.');
                return;
            }
            console.log(`\nFound ${missing.length} missing episodes. Queuing...`);
            descriptors = missing;
        }
        await processDownloads(descriptors, prefs, baseFolder);
    }
    catch (error) {
        outro(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function getSeasonInfo(mode) {
    if (mode === 'url') {
        const value = await text({ message: 'Enter the vidSrc URL:' });
        if (isCancel(value) || !value) {
            throw new Error('Canceled by user.');
        }
        const parsed = helpers.parseVidsrcUrl(value);
        const result = await extractVidsrcLinks(value);
        if (parsed.type === 'movie') {
            return {
                type: 'movie',
                tmdbId: result.tmdbId,
                title: result.metadata.title
            };
        }
        // For TV, fetch season details
        const seasonData = await fetchSeasonDetails(result.tmdbId, parsed.season ?? 1);
        return {
            type: 'tv',
            tmdbId: result.tmdbId,
            title: result.metadata.title,
            seasonNumber: parsed.season ?? 1,
            episodes: seasonData.episodes
        };
    }
    // For tmdb/name modes
    let mediaType;
    let tmdbId;
    if (mode === 'tmdb') {
        const typeChoice = await select({
            message: 'Is it a movie or TV show?',
            options: [
                { value: 'movie', label: 'Movie' },
                { value: 'tv', label: 'TV show' }
            ]
        });
        if (isCancel(typeChoice))
            throw new Error('Canceled by user.');
        mediaType = typeChoice;
        const idInput = await text({ message: 'Enter the TMDb ID:' });
        if (isCancel(idInput) || !idInput)
            throw new Error('Canceled by user.');
        tmdbId = idInput.trim();
    }
    else {
        // name mode
        const typeChoice = await select({
            message: 'Search for movies or TV shows?',
            options: [
                { value: 'movie', label: 'Movie' },
                { value: 'tv', label: 'TV show' }
            ]
        });
        if (isCancel(typeChoice))
            throw new Error('Canceled by user.');
        mediaType = typeChoice;
        const query = await text({ message: 'Enter name query:' });
        if (isCancel(query) || !query)
            throw new Error('Canceled by user.');
        const searchResults = await searchTmdb(mediaType, query.trim());
        if (!searchResults.length)
            throw new Error('No results found for this query.');
        const options = searchResults.map((item) => ({
            value: item,
            label: `${item.title} (${item.year})`
        }));
        const choice = await select({ message: 'Pick a result', options });
        if (isCancel(choice))
            throw new Error('Canceled by user.');
        tmdbId = choice.tmdbId;
    }
    if (mediaType === 'movie') {
        const details = await fetchTmdbMovie(tmdbId);
        return {
            type: 'movie',
            tmdbId,
            title: details.title
        };
    }
    // TV show
    const show = await fetchTmdbShow(tmdbId);
    const seasonNumber = await chooseSeason(show.seasons);
    const seasonData = await fetchSeasonDetails(tmdbId, seasonNumber);
    return {
        type: 'tv',
        tmdbId,
        title: show.name,
        seasonNumber,
        episodes: seasonData.episodes
    };
}
async function selectEpisodesFromSeason(seasonInfo) {
    const choice = await select({
        message: `Season ${seasonInfo.seasonNumber} has ${seasonInfo.episodes.length} episodes. What would you like to do?`,
        options: [
            { value: 'all', label: 'Select all episodes' },
            { value: 'select', label: 'Select specific episodes (space to toggle)' },
            { value: 'custom', label: 'Enter episode range (e.g., 1-3,5)' }
        ]
    });
    if (isCancel(choice)) {
        throw new Error('Canceled by user.');
    }
    if (choice === 'all') {
        return seasonInfo.episodes;
    }
    if (choice === 'select') {
        // Use multiselect for interactive episode selection
        const options = seasonInfo.episodes.map(ep => {
            const label = ep.name ? `E${ep.episode_number.toString().padStart(2, '0')} - ${ep.name}` : `E${ep.episode_number.toString().padStart(2, '0')}`;
            return { value: ep.episode_number, label };
        });
        const selected = await multiselect({
            message: 'Select episodes to download (space to toggle, enter to confirm):',
            options
        });
        if (isCancel(selected)) {
            throw new Error('Canceled by user.');
        }
        if (!selected.length) {
            throw new Error('No episodes selected.');
        }
        // Map back to full episode objects
        return seasonInfo.episodes.filter(ep => selected.includes(ep.episode_number));
    }
    // Custom text input
    const raw = await text({ message: 'Enter episodes (e.g. 1-3,5)' });
    if (isCancel(raw) || !raw) {
        throw new Error('Canceled by user.');
    }
    const parsed = parseEpisodeInput(raw, seasonInfo.episodes.map(e => e.episode_number));
    if (!parsed.length) {
        throw new Error('No valid episodes specified.');
    }
    return seasonInfo.episodes.filter(ep => parsed.includes(ep.episode_number));
}
async function selectTvAction() {
    const choice = await select({
        message: 'What would you like to do?',
        options: [
            { value: 'download', label: 'Download episodes' },
            { value: 'verify', label: 'Verify downloads (check what\'s missing)' },
            { value: 'undownloaded', label: 'Download undownloaded (only missing episodes)' }
        ]
    });
    if (isCancel(choice)) {
        throw new Error('Canceled by user.');
    }
    return choice;
}
async function selectMovieAction() {
    const choice = await select({
        message: 'What would you like to do?',
        options: [
            { value: 'download', label: 'Download movie' },
            { value: 'verify', label: 'Verify download' },
            { value: 'undownloaded', label: 'Download movie if not present' }
        ]
    });
    if (isCancel(choice)) {
        throw new Error('Canceled by user.');
    }
    return choice;
}
async function processDownloads(descriptors, prefs, baseFolder) {
    const queueId = await selectQueue();
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    for (const descriptor of descriptors) {
        console.log(`\nProcessing ${descriptor.description} ...`);
        const result = await processDescriptor(descriptor, queueId, prefs, baseFolder);
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
async function selectConfigBlocking() {
    while (true) {
        const configs = await listConfigs();
        if (configs.length === 0) {
            console.log('\nNo configurations found. Please create one.');
            const newConfig = await createConfigWizard();
            if (newConfig) {
                await setDefaultConfig(newConfig.name);
                return newConfig;
            }
            return null;
        }
        const defaultConfig = await loadDefaultConfig();
        const options = [];
        for (const name of configs) {
            const config = await loadConfig(name);
            if (config) {
                const pathInfo = config.downloadPath ? '' : ' [NO PATH]';
                const isDefault = defaultConfig?.name === name ? ' (default)' : '';
                options.push({ value: name, label: `${name}${isDefault}${pathInfo}` });
            }
        }
        options.push({ value: 'create', label: 'Create new configuration' });
        options.push({ value: 'manage', label: 'Manage configurations' });
        const choice = await select({
            message: 'Select configuration:',
            options
        });
        if (isCancel(choice)) {
            return null;
        }
        if (choice === 'create') {
            const newConfig = await createConfigWizard();
            if (newConfig) {
                const setDefault = await confirm({ message: `Set "${newConfig.name}" as default?` });
                if (setDefault && !isCancel(setDefault)) {
                    await setDefaultConfig(newConfig.name);
                }
                return newConfig;
            }
            continue;
        }
        if (choice === 'manage') {
            await runConfigTui();
            continue;
        }
        const selectedConfig = await loadConfig(choice);
        if (!selectedConfig) {
            console.log('Error loading configuration. Please try again.');
            continue;
        }
        if (!selectedConfig.downloadPath) {
            console.log(`\nConfiguration "${selectedConfig.name}" has no download path.`);
            const editChoice = await select({
                message: 'What would you like to do?',
                options: [
                    { value: 'edit', label: 'Add download path to this config' },
                    { value: 'select-other', label: 'Select different configuration' }
                ]
            });
            if (isCancel(editChoice) || editChoice === 'select-other') {
                continue;
            }
            const newPath = await selectDownloadPath();
            if (!newPath) {
                console.log('Download path required. Please try again.');
                continue;
            }
            const validation = await validateDownloadPath(newPath);
            if (!validation.valid) {
                console.log(`Invalid path: ${validation.error}`);
                continue;
            }
            const updatedConfig = { ...selectedConfig, downloadPath: newPath };
            await saveConfig(selectedConfig.name, {
                subtitleLanguage: selectedConfig.subtitleLanguage,
                preferredFormat: selectedConfig.preferredFormat,
                preferredResolution: selectedConfig.preferredResolution,
                downloadPath: newPath
            });
            console.log(`Configuration "${selectedConfig.name}" updated with download path.`);
            return updatedConfig;
        }
        return selectedConfig;
    }
}
async function createConfigWizard() {
    console.log('\n--- Create New Configuration ---');
    const nameInput = await text({
        message: 'Configuration name:',
        placeholder: 'e.g., default, high-quality, mobile'
    });
    if (isCancel(nameInput) || !nameInput) {
        return null;
    }
    const name = String(nameInput).trim().toLowerCase().replace(/\s+/g, '-');
    const configs = await listConfigs();
    if (configs.includes(name)) {
        const overwrite = await confirm({ message: `Configuration "${name}" already exists. Overwrite?` });
        if (!overwrite || isCancel(overwrite)) {
            return null;
        }
    }
    const downloadPath = await selectDownloadPath();
    if (!downloadPath) {
        console.log('Download path is required. Configuration not created.');
        return null;
    }
    const validation = await validateDownloadPath(downloadPath);
    if (!validation.valid) {
        console.log(`Invalid download path: ${validation.error}`);
        return null;
    }
    const subtitleLanguage = await selectSubtitleLanguage();
    const qualityPreference = await selectQualityPreference();
    const config = {
        name,
        subtitleLanguage,
        preferredFormat: qualityPreference.format,
        preferredResolution: qualityPreference.resolution ?? 'auto',
        downloadPath
    };
    await saveConfig(name, config);
    console.log(`\nConfiguration "${name}" created.`);
    return config;
}
function configToPrefs(config) {
    return {
        subtitleLanguage: config.subtitleLanguage,
        qualityPreference: {
            format: config.preferredFormat,
            resolution: config.preferredResolution === 'auto' ? null : config.preferredResolution
        }
    };
}
main();
