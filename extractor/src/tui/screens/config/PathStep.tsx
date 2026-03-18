import React from 'react';
import { Box, Text } from 'ink';
import { Select, TextInput } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';

interface PathStepProps {
  isInput: boolean;
  onSelect: (value: string) => void;
  onInputSubmit: (value: string) => void;
}

export function PathStep({ isInput, onSelect, onInputSubmit }: PathStepProps) {
  if (isInput) {
    return (
      <Box flexDirection="column" paddingLeft={4}>
        <Box marginBottom={1}><Text bold>{'Enter download base path:'}</Text></Box>
        <Box>
          <Text color={colors.primary}>{`${symbols.pointer} `}</Text>
          <TextInput placeholder="/home/user/Downloads" onSubmit={onInputSubmit} />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{'Press Enter to submit, Esc to go back'}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Download path:'}</Text></Box>
      <Select
        options={[
          { label: '  Use AB Download Manager default', value: 'default' },
          { label: '  Specify custom path', value: 'custom' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
