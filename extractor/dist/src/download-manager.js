export const DOWNLOAD_MANAGER_BASE = 'http://localhost:15151';
const DOWNLOAD_REFERER = 'https://dl.vidsrc.vip/';
const DOWNLOAD_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
const DOWNLOAD_ACCEPT_LANGUAGE = 'en-US,en;q=0.6';
export function buildDownloadHeaders() {
    return {
        referer: DOWNLOAD_REFERER,
        origin: DOWNLOAD_REFERER,
        'user-agent': DOWNLOAD_USER_AGENT,
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': DOWNLOAD_ACCEPT_LANGUAGE
    };
}
function normalizeFileType(format) {
    if (!format) {
        return 'unknown';
    }
    const trimmed = format.trim();
    if (!trimmed) {
        return 'unknown';
    }
    const parts = trimmed.split('/');
    const candidate = parts[parts.length - 1];
    return candidate ? candidate.toLowerCase() : trimmed.toLowerCase();
}
function buildFilename(name, format) {
    const fileExtension = normalizeFileType(format);
    if (fileExtension === 'unknown') {
        return name;
    }
    const extensionWithDot = `.${fileExtension}`;
    if (name.toLowerCase().endsWith(extensionWithDot)) {
        return name;
    }
    return `${name}${extensionWithDot}`;
}
export async function sendToDownloadManager(entry, downloadPage, queueId, name) {
    const request = {
        items: [
            {
                link: entry.url,
                downloadPage: downloadPage,
                headers: buildDownloadHeaders(),
                description: name,
                suggestedName: buildFilename(name, entry.format),
                type: 'http'
            }
        ],
        options: {
            silentAdd: true,
            silentStart: false
        }
    };
    const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });
    if (!response.ok) {
        throw new Error(`Download manager returned ${response.status}`);
    }
}
export async function pingDownloadManager() {
    try {
        const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/ping`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
