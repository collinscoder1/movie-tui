import { spinner } from '@clack/prompts';
import { sendToDownloadManager } from '../download-manager.js';
import { extractVidsrcLinks } from '../extractor.js';
import { buildVidsrcUrl } from '../search.js';
import { promptForAvailableQuality } from './prompts.js';
import { validateDownloadPath } from '../config.js';
export async function processDescriptor(descriptor, queueId, prefs, baseFolder) {
    // Validate/create base folder if provided
    if (baseFolder) {
        const validation = await validateDownloadPath(baseFolder);
        if (!validation.valid) {
            console.log(`  Error: Download folder "${baseFolder}" is not accessible: ${validation.error}`);
            return 'fail';
        }
    }
    let result;
    try {
        result = await extractVidsrcLinks(buildVidsrcUrl(descriptor));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
            console.log(` Network error: Unable to fetch downloads. Check your connection.`);
        }
        else if (errorMessage.includes('Unable to resolve')) {
            console.log(` Source not found: No downloads available for this episode.`);
        }
        else if (errorMessage.includes('timeout')) {
            console.log(` Request timed out: The server took too long to respond.`);
        }
        else {
            console.log(` Extraction failed: ${errorMessage}`);
        }
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
        // Use the title from TMDb metadata for the folder name
        await sendToDownloadManager(entry, downloadPage, queueId, descriptor.description, baseFolder, false, descriptor.title);
        if (prefs.subtitleLanguage) {
            const subtitle = result.subtitles.find((s) => s.lanName === prefs.subtitleLanguage);
            if (subtitle) {
                const subEntry = {
                    format: 'SRT',
                    resolution: null,
                    size: subtitle.size,
                    url: subtitle.url
                };
                await sendToDownloadManager(subEntry, downloadPage, queueId, `${descriptor.description} - ${prefs.subtitleLanguage} subtitle`, baseFolder, true, descriptor.title);
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Download manager returned')) {
            const statusCode = errorMessage.match(/\d+/)?.[0];
            console.log(` Download manager error (HTTP ${statusCode}): Service unavailable. Check if AB Download Manager is running.`);
        }
        else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
            console.log(` Cannot connect to download manager: Make sure AB Download Manager is running on localhost:15151.`);
        }
        else {
            console.log(` Download failed: ${errorMessage}`);
        }
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
        const candidates = formatFilter
            ? allEntries.filter((e) => e.format === formatFilter)
            : allEntries;
        const bestEntry = findBestQuality(candidates.length > 0 ? candidates : allEntries);
        if (bestEntry) {
            console.log(`  Auto-selected: ${bestEntry.format} ${bestEntry.resolution || 'any'} (${bestEntry.size})`);
        }
        return bestEntry;
    }
    const candidates = formatFilter
        ? allEntries.filter((e) => e.format === formatFilter && typeof e.resolution === 'string' && e.resolution.startsWith(resolutionFilter))
        : allEntries.filter((e) => typeof e.resolution === 'string' && e.resolution.startsWith(resolutionFilter));
    if (candidates.length > 0) {
        const entry = candidates[0];
        console.log(`  Found ${formatFilter || 'any'} ${resolutionFilter}p: ${entry.format} ${entry.resolution} (${entry.size})`);
        return entry;
    }
    const targetDesc = formatFilter ? `${formatFilter} ${resolutionFilter}p` : `${resolutionFilter}p`;
    console.log(`  ${targetDesc} not available for this episode`);
    return await promptForAvailableQuality(allEntries);
}
function findBestQuality(entries) {
    const resolutionPriority = ['1080', '720', '480', '360'];
    for (const res of resolutionPriority) {
        const match = entries.find((e) => typeof e.resolution === 'string' && e.resolution.startsWith(res));
        if (match)
            return match;
    }
    return entries[0] ?? null;
}
