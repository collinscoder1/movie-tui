import React, { useState, useEffect, useCallback } from 'react';
import { Box, useInput } from 'ink';
import { EpisodeDescriptor, MediaSource, DownloadEntry, ExtractionResult } from '../../../source/index.js';
import { Config } from '../../../config.js';
import { UserPreferences } from '../../types.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import {
  fetchDownloadLinks,
  autoSelectQuality,
  queueDownload,
  queueSubtitle,
  fetchQueues,
  getDefaultQueueId,
  DownloadItemStatus,
} from '../../download-core.js';
import { ConfirmStep } from './ConfirmStep.js';
import { QualityPickStep } from './QualityPickStep.js';
import { ProgressList } from './ProgressList.js';
import { SummaryStep } from './SummaryStep.js';

interface DownloadScreenProps {
  descriptors: EpisodeDescriptor[];
  resolution: string | null;
  source: MediaSource;
  config: Config;
  onDone: () => void;
  onBack: () => void;
}

type DownloadStep = 'confirm' | 'qualityPick' | 'processing' | 'done';

export function DownloadScreen({ descriptors, resolution, source, config, onDone, onBack }: DownloadScreenProps) {
  const [step, setStep] = useState<DownloadStep>('confirm');
  const [items, setItems] = useState<DownloadItemStatus[]>(() =>
    descriptors.map(d => ({ descriptor: d, status: 'pending' as const }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queueId, setQueueId] = useState<number | null>(null);
  const [summary, setSummary] = useState({ success: 0, fail: 0, skip: 0 });
  const [qualityPickEntries, setQualityPickEntries] = useState<DownloadEntry[]>([]);
  const [qualityPickIndex, setQualityPickIndex] = useState<number>(-1);
  const [qualityPickExtraction, setQualityPickExtraction] = useState<ExtractionResult | null>(null);

  const prefs: UserPreferences = {
    subtitleLanguage: config.subtitleLanguage ?? null,
    qualityPreference: {
      format: config.preferredFormat ?? 'any',
      resolution: resolution,
    },
  };

  useInput((_input, key) => {
    if (!key.escape) return;
    if (step === 'confirm') onBack();
    if (step === 'done') onDone();
  });

  const processItem = useCallback(async (index: number, qId: number | null) => {
    if (index >= items.length) {
      setStep('done');
      return;
    }

    const item = items[index];
    const descriptor = item.descriptor;

    setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'fetching' as const, message: 'Fetching links...' } : it));

    const { result, error } = await fetchDownloadLinks(descriptor, source);
    if (error || !result) {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'fail' as const, message: error ?? 'Unknown error' } : it));
      setSummary(prev => ({ ...prev, fail: prev.fail + 1 }));
      setCurrentIndex(index + 1);
      return;
    }

    const { entry, allEntries, needsManualSelection } = autoSelectQuality(result, prefs.qualityPreference);

    if (needsManualSelection) {
      setQualityPickEntries(allEntries);
      setQualityPickIndex(index);
      setQualityPickExtraction(result);
      setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'selecting' as const, message: 'Preferred quality unavailable', availableQualities: allEntries } : it));
      setStep('qualityPick');
      return;
    }

    if (!entry) {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'skip' as const, message: 'No suitable quality' } : it));
      setSummary(prev => ({ ...prev, skip: prev.skip + 1 }));
      setCurrentIndex(index + 1);
      return;
    }

    await doQueueDownload(index, entry, result, descriptor, qId);
  }, [items.length, source, prefs.qualityPreference]);

  async function doQueueDownload(index: number, entry: DownloadEntry, extraction: ExtractionResult, descriptor: EpisodeDescriptor, qId: number | null) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'queuing' as const, message: `Queuing ${entry.format} ${entry.resolution ?? 'auto'}...`, selectedEntry: entry } : it));

    const { success, error } = await queueDownload(entry, descriptor, qId, prefs, config.downloadPath!);

    if (!success) {
      setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'fail' as const, message: error ?? 'Queue failed' } : it));
      setSummary(prev => ({ ...prev, fail: prev.fail + 1 }));
    } else {
      let subQueued = false;
      if (prefs.subtitleLanguage && extraction) {
        subQueued = await queueSubtitle(extraction, descriptor, qId, prefs.subtitleLanguage, config.downloadPath!);
      }
      const msg = `${entry.format} ${entry.resolution ?? 'auto'} (${entry.size})${subQueued ? ' + subtitle' : ''}`;
      setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'success' as const, message: msg, selectedEntry: entry } : it));
      setSummary(prev => ({ ...prev, success: prev.success + 1 }));
    }

    setCurrentIndex(index + 1);
  }

  useEffect(() => {
    if (step !== 'processing') return;
    if (currentIndex < items.length) {
      processItem(currentIndex, queueId);
    } else {
      setStep('done');
    }
  }, [currentIndex, step]);

  async function handleConfirm(value: string) {
    if (value === 'cancel') { onBack(); return; }

    const queues = await fetchQueues();
    const qId = queues ? getDefaultQueueId(queues) : null;
    setQueueId(qId);
    setStep('processing');
    setCurrentIndex(0);
  }

  async function handleQualityPick(value: string) {
    if (value === '_skip') {
      setItems(prev => prev.map((it, i) => i === qualityPickIndex ? { ...it, status: 'skip' as const, message: 'Skipped by user' } : it));
      setSummary(prev => ({ ...prev, skip: prev.skip + 1 }));
      setStep('processing');
      setCurrentIndex(qualityPickIndex + 1);
      return;
    }

    const entryIndex = parseInt(value, 10);
    const entry = qualityPickEntries[entryIndex];
    if (!entry) return;

    setStep('processing');
    const descriptor = items[qualityPickIndex].descriptor;
    await doQueueDownload(qualityPickIndex, entry, qualityPickExtraction!, descriptor, queueId);
  }

  return (
    <Box flexDirection="column">
      <Header breadcrumb={['Home', 'Search', 'Download']} />

      {step === 'confirm' && (
        <ConfirmStep descriptors={descriptors} onConfirm={handleConfirm} />
      )}

      {step === 'qualityPick' && (
        <QualityPickStep
          description={items[qualityPickIndex]?.descriptor.description ?? ''}
          entries={qualityPickEntries}
          onSelect={handleQualityPick}
        />
      )}

      {(step === 'processing' || step === 'done') && (
        <Box flexDirection="column">
          <ProgressList
            items={items}
            currentIndex={currentIndex}
            totalCount={items.length}
            isProcessing={step === 'processing'}
          />
          {step === 'done' && (
            <SummaryStep
              success={summary.success}
              fail={summary.fail}
              skip={summary.skip}
              onDone={onDone}
            />
          )}
        </Box>
      )}

      <StatusBar />
    </Box>
  );
}
