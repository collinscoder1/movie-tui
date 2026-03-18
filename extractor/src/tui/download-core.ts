// UI-free download logic extracted from downloads.ts
// Used by the Ink TUI download screen

import { sendToDownloadManager } from '../download-manager.js';
import { ExtractionResult, DownloadEntry, EpisodeDescriptor, MediaSource } from '../source/index.js';
import { QualityPreference, UserPreferences } from './types.js';
import { validateDownloadPath } from '../config.js';

export interface DownloadItemStatus {
  descriptor: EpisodeDescriptor;
  status: 'pending' | 'fetching' | 'selecting' | 'queuing' | 'success' | 'fail' | 'skip';
  message?: string;
  availableQualities?: DownloadEntry[];
  selectedEntry?: DownloadEntry;
  extraction?: ExtractionResult;
}

export async function fetchDownloadLinks(
  descriptor: EpisodeDescriptor,
  source: MediaSource
): Promise<{ result?: ExtractionResult; error?: string }> {
  try {
    const result = await source.fetchDownloads(descriptor);
    if (Object.keys(result.downloads).length === 0) {
      return { error: 'No downloads available' };
    }
    return { result };
  } catch (error) {
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

export function autoSelectQuality(
  result: ExtractionResult,
  preference: QualityPreference
): { entry: DownloadEntry | null; allEntries: DownloadEntry[]; needsManualSelection: boolean } {
  const allEntries = Object.values(result.downloads).flat() as DownloadEntry[];
  if (allEntries.length === 0) {
    return { entry: null, allEntries, needsManualSelection: false };
  }

  const formatFilter = preference.format === 'any' ? null : preference.format;
  const resolutionFilter = preference.resolution;

  if (resolutionFilter === null) {
    const candidates = formatFilter
      ? allEntries.filter((e: DownloadEntry) => e.format === formatFilter)
      : allEntries;
    const best = findBestQuality(candidates.length > 0 ? candidates : allEntries);
    return { entry: best, allEntries, needsManualSelection: false };
  }

  const candidates = formatFilter
    ? allEntries.filter((e: DownloadEntry) => e.format === formatFilter && typeof e.resolution === 'string' && e.resolution.startsWith(resolutionFilter))
    : allEntries.filter((e: DownloadEntry) => typeof e.resolution === 'string' && e.resolution.startsWith(resolutionFilter));

  if (candidates.length > 0) {
    return { entry: candidates[0], allEntries, needsManualSelection: false };
  }

  // Preferred quality not available - needs manual selection
  return { entry: null, allEntries, needsManualSelection: true };
}

export function findBestQuality(entries: DownloadEntry[]): DownloadEntry | null {
  const resolutionPriority = ['1080', '720', '480', '360'];
  for (const res of resolutionPriority) {
    const match = entries.find((e: DownloadEntry) => typeof e.resolution === 'string' && e.resolution.startsWith(res));
    if (match) return match;
  }
  return entries[0] ?? null;
}

export async function queueDownload(
  entry: DownloadEntry,
  descriptor: EpisodeDescriptor,
  queueId: number | null,
  prefs: UserPreferences,
  baseFolder: string
): Promise<{ success: boolean; error?: string; subtitleQueued?: boolean }> {
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
  } catch (error) {
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

export async function queueSubtitle(
  result: ExtractionResult,
  descriptor: EpisodeDescriptor,
  queueId: number | null,
  language: string,
  baseFolder: string
): Promise<boolean> {
  const subtitle = result.subtitles.find((s: { lanName: string }) => s.lanName === language);
  if (!subtitle) return false;

  try {
    const subEntry: DownloadEntry = {
      format: 'SRT',
      resolution: null,
      size: subtitle.size,
      url: subtitle.url,
    };
    const downloadPage = `https://dl.vidsrc.vip/${descriptor.type}/tmdb-${descriptor.tmdbId}`;
    await sendToDownloadManager(subEntry, downloadPage, queueId, `${descriptor.description} - ${language} subtitle`, baseFolder, true, descriptor.title);
    return true;
  } catch {
    return false;
  }
}

export async function fetchQueues(): Promise<Array<{ id: number; name: string }> | null> {
  try {
    const response = await fetch('http://localhost:15151/queues');
    if (!response.ok) return null;
    const queues = await response.json();
    return queues?.length ? queues : null;
  } catch {
    return null;
  }
}

export function getDefaultQueueId(queues: Array<{ id: number; name: string }>): number | null {
  const defaultQueue = queues.find(q => q.name === 'movie-downloads');
  return defaultQueue?.id ?? null;
}
