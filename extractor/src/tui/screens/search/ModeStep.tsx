import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { SourceKey } from '../../../source/index.js';
import { symbols } from '../../theme.js';

type SearchMode = 'url' | 'tmdb' | 'name';

const unsupportedModes: Partial<Record<SourceKey, SearchMode[]>> = {
  moviebox: ['url'],
  wco: ['tmdb'],
};

interface ModeStepProps {
  sourceKey: SourceKey;
  onSelect: (value: string) => void;
}

export function ModeStep({ sourceKey, onSelect }: ModeStepProps) {
  const modeOptions = [
    { label: '  Provide a URL', value: 'url' },
    { label: '  Lookup by TMDb ID', value: 'tmdb' },
    { label: '  Search by name', value: 'name' },
  ].filter(opt => !(unsupportedModes[sourceKey] ?? []).includes(opt.value as SearchMode));

  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'How to find media:'}</Text></Box>
      <SelectAll
        options={[
          ...modeOptions,
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
