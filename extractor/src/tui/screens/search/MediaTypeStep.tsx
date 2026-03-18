import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';

interface MediaTypeStepProps {
  onSelect: (value: string) => void;
}

export function MediaTypeStep({ onSelect }: MediaTypeStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Media type:'}</Text></Box>
      <Select
        options={[
          { label: '  Movie', value: 'movie' },
          { label: '  TV Show', value: 'tv' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
