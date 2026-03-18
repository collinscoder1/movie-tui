import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { SearchResult } from '../../../source/index.js';
import { symbols } from '../../theme.js';

interface ResultsStepProps {
  results: SearchResult[];
  onSelect: (value: string) => void;
}

export function ResultsStep({ results, onSelect }: ResultsStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{`Found ${results.length} results:`}</Text></Box>
      <Select
        options={[
          ...results.map((r, i) => ({
            label: `  ${r.title} (${r.year})`,
            value: String(i),
          })),
          { label: `  ${symbols.arrowRight} Back to search`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
