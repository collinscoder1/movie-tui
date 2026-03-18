import { create } from 'zustand';
import { EpisodeDescriptor, MediaSource, DownloadEntry, ExtractionResult } from '../../source/index.js';
import { UserPreferences } from '../types.js';
import {
  fetchDownloadLinks,
  autoSelectQuality,
  queueDownload,
  queueSubtitle,
  fetchQueues,
  getDefaultQueueId,
} from '../download-core.js';

export type DownloadStep = 'idle' | 'confirm' | 'processing' | 'qualityPick' | 'done';
export type ItemStatus = 'pending' | 'fetching' | 'selecting' | 'queuing' | 'success' | 'fail' | 'skip';

export interface DownloadItem {
  descriptor: EpisodeDescriptor;
  status: ItemStatus;
  message?: string;
  extraction?: ExtractionResult;
  availableQualities?: DownloadEntry[];
  selectedEntry?: DownloadEntry;
}

interface DownloadState {
  step: DownloadStep;
  items: DownloadItem[];
  queueId: number | null;
  summary: { success: number; fail: number; skip: number };
  qualityPickIndex: number;
  qualityPickEntries: DownloadEntry[];
  qualityPickExtraction: ExtractionResult | null;
  
  source: MediaSource | null;
  prefs: UserPreferences | null;
  downloadPath: string | null;
  
  init: (descriptors: EpisodeDescriptor[], source: MediaSource, prefs: UserPreferences, downloadPath: string) => void;
  confirm: () => Promise<void>;
  pickQuality: (entryIndex: number | '_skip') => Promise<void>;
  cancel: () => void;
  reset: () => void;
  processAll: (startIndex: number) => Promise<void>;
  queueItem: (index: number, entry: DownloadEntry, extraction: ExtractionResult) => Promise<void>;
}

export const useDownloadStore = create<DownloadState>()((set, get) => ({
  step: 'idle',
  items: [],
  queueId: null,
  summary: { success: 0, fail: 0, skip: 0 },
  qualityPickIndex: -1,
  qualityPickEntries: [],
  qualityPickExtraction: null,
  source: null,
  prefs: null,
  downloadPath: null,

  init: (descriptors, source, prefs, downloadPath) => {
    set({
      step: 'confirm',
      items: descriptors.map(d => ({ descriptor: d, status: 'pending' as const })),
      summary: { success: 0, fail: 0, skip: 0 },
      source,
      prefs,
      downloadPath,
      queueId: null,
      qualityPickIndex: -1,
      qualityPickEntries: [],
      qualityPickExtraction: null,
    });
  },

  confirm: async () => {
    const queues = await fetchQueues();
    const queueId = queues ? getDefaultQueueId(queues) : null;
    set({ queueId, step: 'processing' });
    
    await get().processAll(0);
  },

  processAll: async (startIndex: number) => {
    const { items, queueId, source, prefs, downloadPath } = get();
    if (!source || !prefs || !downloadPath) return;

    for (let i = startIndex; i < items.length; i++) {
      const item = items[i];

      set(state => ({
        items: state.items.map((it, idx) =>
          idx === i ? { ...it, status: 'fetching' as const, message: 'Fetching links...' } : it
        ),
      }));

      const { result, error } = await fetchDownloadLinks(item.descriptor, source);
      if (error || !result) {
        set(state => ({
          items: state.items.map((it, idx) =>
            idx === i ? { ...it, status: 'fail' as const, message: error ?? 'Unknown error' } : it
          ),
          summary: { ...state.summary, fail: state.summary.fail + 1 },
        }));
        continue;
      }

      const { entry, allEntries, needsManualSelection } = autoSelectQuality(result, prefs.qualityPreference);

      if (needsManualSelection) {
        set(state => ({
          qualityPickIndex: i,
          qualityPickEntries: allEntries,
          qualityPickExtraction: result,
          step: 'qualityPick',
          items: state.items.map((it, idx) =>
            idx === i ? {
              ...it,
              status: 'selecting' as const,
              message: 'Preferred quality unavailable',
              availableQualities: allEntries,
              extraction: result,
            } : it
          ),
        }));
        return;
      }

      if (!entry) {
        set(state => ({
          items: state.items.map((it, idx) =>
            idx === i ? { ...it, status: 'skip' as const, message: 'No suitable quality' } : it
          ),
          summary: { ...state.summary, skip: state.summary.skip + 1 },
        }));
        continue;
      }

      await get().queueItem(i, entry, result);
    }

    set({ step: 'done' });
  },

  queueItem: async (index: number, entry: DownloadEntry, extraction: ExtractionResult) => {
    const { items, queueId, prefs, downloadPath } = get();
    if (!prefs || !downloadPath) return;

    const item = items[index];

    set(state => ({
      items: state.items.map((it, idx) =>
        idx === index ? { ...it, status: 'queuing' as const, message: `Queuing ${entry.format} ${entry.resolution ?? 'auto'}...` } : it
      ),
    }));

    const { success, error } = await queueDownload(entry, item.descriptor, queueId, prefs, downloadPath);

    if (success) {
      let subQueued = false;
      if (prefs.subtitleLanguage) {
        subQueued = await queueSubtitle(extraction, item.descriptor, queueId, prefs.subtitleLanguage, downloadPath);
      }

      set(state => ({
        items: state.items.map((it, idx) =>
          idx === index ? {
            ...it,
            status: 'success' as const,
            message: `${entry.format} ${entry.resolution ?? 'auto'} (${entry.size})${subQueued ? ' + subtitle' : ''}`,
            selectedEntry: entry,
          } : it
        ),
        summary: { ...state.summary, success: state.summary.success + 1 },
      }));
    } else {
      set(state => ({
        items: state.items.map((it, idx) =>
          idx === index ? { ...it, status: 'fail' as const, message: error ?? 'Queue failed' } : it
        ),
        summary: { ...state.summary, fail: state.summary.fail + 1 },
      }));
    }
  },

  pickQuality: async (entryIndex) => {
    const { qualityPickIndex, qualityPickEntries, qualityPickExtraction } = get();

    if (entryIndex === '_skip') {
      set(state => ({
        items: state.items.map((it, idx) =>
          idx === qualityPickIndex ? { ...it, status: 'skip' as const, message: 'Skipped by user' } : it
        ),
        summary: { ...state.summary, skip: state.summary.skip + 1 },
        step: 'processing',
      }));

      await get().processAll(qualityPickIndex + 1);
      return;
    }

    const entry = qualityPickEntries[entryIndex];
    if (!entry || !qualityPickExtraction) return;

    set({ step: 'processing' });

    await get().queueItem(qualityPickIndex, entry, qualityPickExtraction);

    await get().processAll(qualityPickIndex + 1);
  },

  cancel: () => {
    set({ step: 'idle', items: [] });
  },

  reset: () => {
    set({
      step: 'idle',
      items: [],
      queueId: null,
      summary: { success: 0, fail: 0, skip: 0 },
      qualityPickIndex: -1,
      qualityPickEntries: [],
      qualityPickExtraction: null,
      source: null,
      prefs: null,
      downloadPath: null,
    });
  },
}));
