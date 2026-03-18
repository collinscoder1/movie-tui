import { select, multiselect, text, isCancel } from '@clack/prompts';
import { DOWNLOAD_MANAGER_BASE } from '../download-manager.js';
export async function selectQueue() {
    try {
        const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/queues`);
        if (!response.ok) {
            return null;
        }
        const queues = await response.json();
        if (!queues?.length) {
            return null;
        }
        // Look for default "movie-downloads" queue
        const defaultQueue = queues.find((q) => q.name === 'movie-downloads');
        if (defaultQueue) {
            console.log(`  Using default queue: movie-downloads`);
            return defaultQueue.id;
        }
        // Default not found - show selector with message
        const choice = await select({
            message: `Default queue 'movie-downloads' not found. Select a queue:`,
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
export async function selectSubtitleLanguage() {
    const choice = await select({
        message: 'Select subtitle language:',
        options: [
            { value: null, label: 'No subtitles' },
            { value: 'English', label: 'English' },
            { value: 'Spanish', label: 'Spanish' },
            { value: 'Arabic', label: 'Arabic' }
        ]
    });
    if (isCancel(choice)) {
        return null;
    }
    return choice;
}
export async function selectQualityPreference() {
    const formatChoice = await select({
        message: 'Select preferred format:',
        options: [
            { value: 'MP4', label: 'MP4' },
            { value: 'MKV', label: 'MKV' },
            { value: 'any', label: 'Any format' }
        ]
    });
    const selectedFormat = isCancel(formatChoice) ? 'any' : formatChoice;
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
export async function chooseSeason(seasons) {
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
export async function chooseEpisodes(available, season, episodeTitles) {
    const choice = await select({
        message: `Season ${season} has ${available.length} episodes. What would you like to do?`,
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
        return available;
    }
    if (choice === 'select') {
        // Use multiselect for interactive episode selection
        const options = available.map(ep => {
            const title = episodeTitles?.get(ep);
            const label = title ? `E${ep.toString().padStart(2, '0')} - ${title}` : `E${ep.toString().padStart(2, '0')}`;
            return { value: ep, label };
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
        return selected;
    }
    // Custom text input
    const raw = await text({ message: 'Enter episodes (e.g. 1-3,5)' });
    if (isCancel(raw) || !raw) {
        throw new Error('Canceled by user.');
    }
    const { parseEpisodeInput } = await import('../source/index.js');
    const parsed = parseEpisodeInput(raw, available);
    if (!parsed.length) {
        throw new Error('No valid episodes specified.');
    }
    return parsed;
}
export async function promptForAvailableQuality(entries) {
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
export async function selectResolution(configDefault) {
    // Pre-select config default if it matches an option
    const defaultValue = ['1080', '720', '480', '360'].includes(configDefault ?? '') ? configDefault : null;
    const options = [
        ...(defaultValue ? [{ value: defaultValue, label: `${defaultValue}p (Default from config)` }] : []),
        { value: '1080', label: '1080p (Full HD)' },
        { value: '720', label: '720p (HD)' },
        { value: '480', label: '480p (SD)' },
        { value: '360', label: '360p (Low)' },
        { value: null, label: 'Auto (best available)' }
    ];
    const choice = await select({
        message: 'Select resolution:',
        options
    });
    return isCancel(choice) ? defaultValue : choice;
}
export async function selectDownloadPath() {
    const choice = await select({
        message: 'Configure download path?',
        options: [
            { value: null, label: 'Use AB Download Manager default' },
            { value: 'custom', label: 'Specify custom path' }
        ]
    });
    if (isCancel(choice) || choice === null) {
        return null;
    }
    const pathInput = await text({
        message: 'Enter download base path (e.g., /home/user/Downloads):',
        placeholder: '/home/user/Downloads'
    });
    if (isCancel(pathInput) || !pathInput) {
        return null;
    }
    // Normalize path (ensure no trailing slash)
    return String(pathInput).trim().replace(/\/$/, '');
}
