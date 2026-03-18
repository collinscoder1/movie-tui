import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { SourceEpisode } from '../../../source/types.js';
import { symbols } from '../../theme.js';

interface EpisodesStepProps {
  seasonNumber: number;
  episodes: SourceEpisode[];
  onSelect: (value: string) => void;
}

export function EpisodesStep({ seasonNumber, episodes, onSelect }: EpisodesStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{`Season ${seasonNumber} - ${episodes.length} episodes:`}</Text></Box>
      <SelectAll
        options={[
          { label: '  Select all episodes', value: 'all' },
          { label: '  Pick specific episodes (space to toggle)', value: 'select' },
          { label: '  Enter episode range (e.g., 1-3,5)', value: 'custom' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>{'Available episodes:'}</Text>
        <Box flexWrap="wrap" width={60} marginTop={1}>
          {episodes.map(ep => (
            <Box key={ep.episode_number} width={14}>
              <Text dimColor>{`  E${String(ep.episode_number).padStart(2, '0')} `}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
