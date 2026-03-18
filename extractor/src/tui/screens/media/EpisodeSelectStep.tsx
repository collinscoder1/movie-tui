import React from 'react';
import { Box, Text } from 'ink';
import { MultiSelect } from '@inkjs/ui';
import { SourceEpisode } from '../../../source/types.js';

interface EpisodeSelectStepProps {
  episodes: SourceEpisode[];
  onSubmit: (values: string[]) => void;
}

export function EpisodeSelectStep({ episodes, onSubmit }: EpisodeSelectStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Select episodes (space to toggle, enter to confirm):'}</Text></Box>
      <MultiSelect
        options={episodes.map(ep => {
          const title = ep.name;
          const label = title
            ? `  E${String(ep.episode_number).padStart(2, '0')} - ${title}`
            : `  E${String(ep.episode_number).padStart(2, '0')}`;
          return { label, value: String(ep.episode_number) };
        })}
        onSubmit={onSubmit}
      />
      <Box marginTop={1}>
        <Text dimColor>{'Space to toggle, Enter to confirm, Esc to go back'}</Text>
      </Box>
    </Box>
  );
}
