import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';

interface ConfigResolutionStepProps {
  onSelect: (value: string) => void;
}

export function ConfigResolutionStep({ onSelect }: ConfigResolutionStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Preferred resolution:'}</Text></Box>
      <Select
        options={[
          { label: '  1080p (Full HD)', value: '1080' },
          { label: '  720p (HD)', value: '720' },
          { label: '  480p (SD)', value: '480' },
          { label: '  360p (Low)', value: '360' },
          { label: '  Auto (best available)', value: 'auto' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
