import React, { useEffect } from 'react';
import { Box, useInput } from 'ink';
import { EpisodeDescriptor, MediaSource } from '../../../source/index.js';
import { Config } from '../../../config.js';
import { UserPreferences } from '../../types.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { useDownloadStore } from '../../stores/downloadStore.js';
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

export function DownloadScreen({ descriptors, resolution, source, config, onDone, onBack }: DownloadScreenProps) {
  const { step, items, summary, qualityPickIndex, qualityPickEntries, init, confirm, pickQuality, reset } = useDownloadStore();

  const prefs: UserPreferences = {
    subtitleLanguage: config.subtitleLanguage ?? null,
    qualityPreference: {
      format: config.preferredFormat ?? 'any',
      resolution: resolution,
    },
  };

  useEffect(() => {
    init(descriptors, source, prefs, config.downloadPath!);
    return () => reset();
  }, []);

  useInput((_input, key) => {
    if (!key.escape) return;
    if (step === 'confirm') onBack();
    if (step === 'done') onDone();
  });

  return (
    <Box flexDirection="column">
      <Header breadcrumb={['Home', 'Search', 'Download']} />

      {step === 'confirm' && (
        <ConfirmStep
          descriptors={descriptors}
          onConfirm={(value) => {
            if (value === 'cancel') onBack();
            else confirm();
          }}
        />
      )}

      {step === 'qualityPick' && (
        <QualityPickStep
          description={items[qualityPickIndex]?.descriptor.description ?? ''}
          entries={qualityPickEntries}
          onSelect={(value) => {
            if (value === '_skip') {
              pickQuality('_skip');
            } else {
              pickQuality(parseInt(value, 10));
            }
          }}
        />
      )}

      {(step === 'processing' || step === 'done') && (
        <Box flexDirection="column">
          <ProgressList
            items={items}
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
