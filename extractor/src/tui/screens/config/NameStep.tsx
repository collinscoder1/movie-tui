import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { SelectAll } from '../../components/SelectAll.js';
import { colors, symbols } from '../../theme.js';

interface NameStepProps {
  isCustom: boolean;
  onSelect: (value: string) => void;
  onCustomSubmit: (value: string) => void;
}

export function NameStep({ isCustom, onSelect, onCustomSubmit }: NameStepProps) {
  if (isCustom) {
    return (
      <Box flexDirection="column" paddingLeft={4}>
        <Box marginBottom={1}><Text bold>{'Enter configuration name:'}</Text></Box>
        <Box>
          <Text color={colors.primary}>{`${symbols.pointer} `}</Text>
          <TextInput placeholder="my-config" onSubmit={onCustomSubmit} />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{'Press Enter to submit, Esc to go back'}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{'Choose a name:'}</Text></Box>
      <SelectAll
        options={[
          { label: '  default', value: 'default' },
          { label: '  high-quality', value: 'high-quality' },
          { label: '  mobile', value: 'mobile' },
          { label: '  Custom name...', value: 'custom' },
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
