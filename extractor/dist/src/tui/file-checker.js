import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
export function sanitizeName(name) {
    return name
        .replace(/ \(movie\)$/i, '')
        .replace(/[\/\\:*?"<>|]/g, '-')
        .trim();
}
export async function checkExistingDownloads(descriptors, baseFolder) {
    const downloaded = [];
    const missing = [];
    for (const descriptor of descriptors) {
        const exists = await isFileDownloaded(descriptor, baseFolder);
        if (exists) {
            downloaded.push(descriptor);
        }
        else {
            missing.push(descriptor);
        }
    }
    return { downloaded, missing };
}
async function isFileDownloaded(descriptor, baseFolder) {
    if (!baseFolder)
        return false;
    const sanitizedTitle = sanitizeName(descriptor.title);
    const folderPath = join(baseFolder, sanitizedTitle);
    try {
        const files = await readdir(folderPath);
        // Build expected filename pattern
        const expectedPattern = descriptor.type === 'tv'
            ? `${sanitizedTitle} S${descriptor.season}E${descriptor.episode}`
            : sanitizedTitle;
        // Check if ANY file starts with this pattern
        return files.some(file => file.startsWith(expectedPattern));
    }
    catch {
        return false; // Folder doesn't exist
    }
}
export function formatVerificationResults(descriptors, downloaded) {
    const missing = descriptors.filter(d => !downloaded.find(x => x.type === d.type &&
        x.tmdbId === d.tmdbId &&
        x.season === d.season &&
        x.episode === d.episode));
    let result = '';
    if (descriptors[0].type === 'tv') {
        result += `${descriptors[0].title} Season ${descriptors[0].season}:\n`;
        for (const d of descriptors) {
            const isDownloaded = downloaded.find(x => x.season === d.season && x.episode === d.episode);
            const status = isDownloaded ? '✓' : '✗';
            result += `  ${status} E${d.episode?.toString().padStart(2, '0')}\n`;
        }
    }
    else {
        // Movie
        const isDownloaded = downloaded.length > 0;
        const status = isDownloaded ? '✓' : '✗';
        result += `${descriptors[0].title}: ${status}\n`;
    }
    result += `\n${downloaded.length}/${descriptors.length} downloaded, ${missing.length} missing`;
    return result;
}
