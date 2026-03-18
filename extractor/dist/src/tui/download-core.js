// UI-free download logic extracted from downloads.ts
// Used by the Ink TUI download screen
import { sendToDownloadManager } from '../download-manager.js';
import { validateDownloadPath } from '../config.js';
export async function fetchDownloadLinks(descriptor, source) {
    try {
        const result = await source.fetchDownloads(descriptor);
        if (Object.keys(result.downloads).length === 0) {
            return { error: 'No downloads available' };
        }
        return { result };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('fetch failed') || msg.includes('network')) {
            return { error: 'Network error: check your connection' };
        }
        if (msg.includes('Unable to resolve')) {
            return { error: 'Source not found: no downloads available' };
        }
        if (msg.includes('timeout')) {
            return { error: 'Request timed out' };
        }
        return { error: `Extraction failed: ${msg}` };
    }
}
export function autoSelectQuality(result, preference) {
    const allEntries = Object.values(result.downloads).flat();
    if (allEntries.length === 0) {
        return { entry: null, allEntries, needsManualSelection: false };
    }
    const formatFilter = preference.format === 'any' ? null : preference.format;
    const resolutionFilter = preference.resolution;
    if (resolutionFilter === null) {
        const candidates = formatFilter
            ? allEntries.filter((e) => e.format === formatFilter)
            : allEntries;
        const best = findBestQuality(candidates.length > 0 ? candidates : allEntries);
        return { entry: best, allEntries, needsManualSelection: false };
    }
    const candidates = formatFilter
        ? allEntries.filter((e) => e.format === formatFilter && typeof e.resolution === 'string' && e.resolution.startsWith(resolutionFilter))
        : allEntries.filter((e) => typeof e.resolution === 'string' && e.resolution.startsWith(resolutionFilter));
    if (candidates.length > 0) {
        return { entry: candidates[0], allEntries, needsManualSelection: false };
    }
    // Preferred quality not available - needs manual selection
    return { entry: null, allEntries, needsManualSelection: true };
}
export function findBestQuality(entries) {
    const resolutionPriority = ['1080', '720', '480', '360'];
    for (const res of resolutionPriority) {
        const match = entries.find((e) => typeof e.resolution === 'string' && e.resolution.startsWith(res));
        if (match)
            return match;
    }
    return entries[0] ?? null;
}
export async function queueDownload(entry, descriptor, queueId, prefs, baseFolder) {
    // Validate folder
    if (baseFolder) {
        const validation = await validateDownloadPath(baseFolder);
        if (!validation.valid) {
            return { success: false, error: `Download folder not accessible: ${validation.error}` };
        }
    }
    try {
        const downloadPage = `https://dl.vidsrc.vip/${descriptor.type}/tmdb-${descriptor.tmdbId}`;
        await sendToDownloadManager(entry, downloadPage, queueId, descriptor.description, baseFolder, false, descriptor.title);
        let subtitleQueued = false;
        // Handle subtitles - we need the extraction result for this
        // Subtitles will be handled separately by the caller if needed
        return { success: true, subtitleQueued };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('Download manager returned')) {
            return { success: false, error: 'Download manager service unavailable' };
        }
        if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
            return { success: false, error: 'Cannot connect to AB Download Manager (localhost:15151)' };
        }
        return { success: false, error: msg };
    }
}
export async function queueSubtitle(result, descriptor, queueId, language, baseFolder) {
    const subtitle = result.subtitles.find((s) => s.lanName === language);
    if (!subtitle)
        return false;
    try {
        const subEntry = {
            format: 'SRT',
            resolution: null,
            size: subtitle.size,
            url: subtitle.url,
        };
        const downloadPage = `https://dl.vidsrc.vip/${descriptor.type}/tmdb-${descriptor.tmdbId}`;
        await sendToDownloadManager(subEntry, downloadPage, queueId, `${descriptor.description} - ${language} subtitle`, baseFolder, true, descriptor.title);
        return true;
    }
    catch {
        return false;
    }
}
export async function fetchQueues() {
    try {
        const response = await fetch('http://localhost:15151/queues');
        if (!response.ok)
            return null;
        const queues = await response.json();
        return queues?.length ? queues : null;
    }
    catch {
        return null;
    }
}
export function getDefaultQueueId(queues) {
    const defaultQueue = queues.find(q => q.name === 'movie-downloads');
    return defaultQueue?.id ?? null;
}
