import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';

interface SourceStepProps {
  onSelect: (value: string) => void;
}

export function SourceStep({ onSelect }: SourceStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Select content source:'}</Text></Box>
      <SelectAll
        options={[
          { label: '  VidSrc (vidsrc.vip)', value: 'vidsrc' },
          { label: '  Moviebox', value: 'moviebox' },
          { label: '  WCO (wcoflix.tv)', value: 'wco' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
