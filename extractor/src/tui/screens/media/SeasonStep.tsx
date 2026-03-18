import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';

interface SeasonStepProps {
  seasons: Array<{ season_number: number; episode_count?: number }>;
  onSelect: (value: string) => void;
}

export function SeasonStep({ seasons, onSelect }: SeasonStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Select season:'}</Text></Box>
      <Select
        options={[
          ...seasons
            .filter(s => s.season_number > 0)
            .map(s => ({
              label: `  Season ${s.season_number}  (${s.episode_count ?? '?'} episodes)`,
              value: String(s.season_number),
            })),
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
