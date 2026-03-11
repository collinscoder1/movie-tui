import type { DownloadEntry } from './extractor.js';
import { homedir } from 'node:os';

export const DOWNLOAD_MANAGER_BASE = 'http://localhost:15151';
const DOWNLOAD_REFERER = 'https://dl.vidsrc.vip/';
const DOWNLOAD_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
const DOWNLOAD_ACCEPT_LANGUAGE = 'en-US,en;q=0.6';

export function buildDownloadHeaders(): Record<string, string> {
  return {
    referer: DOWNLOAD_REFERER,
    origin: DOWNLOAD_REFERER,
    'user-agent': DOWNLOAD_USER_AGENT,
    accept: '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': DOWNLOAD_ACCEPT_LANGUAGE
  };
}

interface HeadlessDownloadRequest {
  downloadSource: {
    link: string;
    headers: Record<string, string>;
    downloadPage: string | null;
    suggestedName: string | null;
  };
  folder?: string | null;
  name?: string | null;
  queueId?: number | null;
}

function normalizeFileType(format: string | null | undefined): string {
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

function buildFilename(name: string, format: string | null | undefined): string {
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

function expandTilde(path: string): string {
  if (path.startsWith('~/')) {
    return path.replace('~', homedir());
  }
  if (path === '~') {
    return homedir();
  }
  return path;
}

export async function sendToDownloadManager(
  entry: DownloadEntry,
  downloadPage: string,
  queueId: number | null,
  name: string,
  baseFolder?: string | null,
  isSubtitle?: boolean
): Promise<void> {
  // Build folder path (expand tilde to home directory)
  let folder: string | undefined = undefined;
  if (baseFolder) {
    const expandedPath = expandTilde(baseFolder);
    if (isSubtitle) {
      folder = `${expandedPath}/subs`;
    } else {
      folder = expandedPath;
    }
  }

  const request: HeadlessDownloadRequest = {
    downloadSource: {
      link: entry.url,
      headers: buildDownloadHeaders(),
      downloadPage: downloadPage,
      suggestedName: buildFilename(name, entry.format)
    }
  };

  if (folder) {
    request.folder = folder;
  }
  if (queueId !== null) {
    request.queueId = queueId;
  }

  const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/start-headless-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Download manager returned ${response.status}`);
  }
}

export async function pingDownloadManager(): Promise<boolean> {
  try {
    const response = await fetch(`${DOWNLOAD_MANAGER_BASE}/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
