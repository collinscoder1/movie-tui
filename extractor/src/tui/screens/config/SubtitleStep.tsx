import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';

interface SubtitleStepProps {
  configName: string;
  onSelect: (value: string) => void;
}

export function SubtitleStep({ configName, onSelect }: SubtitleStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{`Configure "${configName}": Subtitle language`}</Text></Box>
      <Select
        options={[
          { label: '  No subtitles', value: 'none' },
          { label: '  English', value: 'English' },
          { label: '  Spanish', value: 'Spanish' },
          { label: '  Arabic', value: 'Arabic' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
