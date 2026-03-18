import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { DownloadEntry } from '../../../source/index.js';

interface QualityPickStepProps {
  description: string;
  entries: DownloadEntry[];
  onSelect: (value: string) => void;
}

export function QualityPickStep({ description, entries, onSelect }: QualityPickStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>
        {`Preferred quality not available for: ${description}`}
      </Text></Box>
      <Box marginBottom={1}><Text>{'Choose from available qualities:'}</Text></Box>
      <SelectAll
        options={[
          ...entries.map((e, i) => ({
            label: `  ${e.format} ${e.resolution || 'unknown'} - ${e.size}`,
            value: String(i),
          })),
          { label: '  Skip this item', value: '_skip' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
