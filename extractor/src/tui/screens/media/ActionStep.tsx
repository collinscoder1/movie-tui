import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';

interface ActionStepProps {
  isMovie: boolean;
  onSelect: (value: string) => void;
}

export function ActionStep({ isMovie, onSelect }: ActionStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'What would you like to do?'}</Text></Box>
      <SelectAll
        options={[
          { label: isMovie ? '  Download movie' : '  Download episodes', value: 'download' },
          { label: '  Verify existing downloads', value: 'verify' },
          { label: isMovie ? '  Download if missing' : '  Download missing only', value: 'undownloaded' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
