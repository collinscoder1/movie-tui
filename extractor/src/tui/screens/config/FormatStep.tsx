import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';

interface FormatStepProps {
  onSelect: (value: string) => void;
}

export function FormatStep({ onSelect }: FormatStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Preferred format:'}</Text></Box>
      <SelectAll
        options={[
          { label: '  MP4', value: 'MP4' },
          { label: '  MKV', value: 'MKV' },
          { label: '  Any format', value: 'any' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
