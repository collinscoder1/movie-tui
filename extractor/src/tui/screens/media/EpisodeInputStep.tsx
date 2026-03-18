import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';

interface EpisodeInputStepProps {
  onSubmit: (value: string) => void;
}

export function EpisodeInputStep({ onSubmit }: EpisodeInputStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Enter episode range (e.g., 1-3,5,7-10):'}</Text></Box>
      <Box>
        <Text color={colors.primary}>{`${symbols.pointer} `}</Text>
        <TextInput
          placeholder="1-3,5"
          onSubmit={onSubmit}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{'Press Enter to submit, Esc to go back'}</Text>
      </Box>
    </Box>
  );
}
