import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { colors } from '../../theme.js';

interface DeleteConfirmStepProps {
  name: string;
  onConfirm: (value: string) => void;
}

export function DeleteConfirmStep({ name, onConfirm }: DeleteConfirmStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold color={colors.warning}>{`Delete "${name}"?`}</Text></Box>
      <Select
        options={[
          { label: '  Yes, delete', value: 'yes' },
          { label: '  No, cancel', value: 'no' },
        ]}
        onChange={onConfirm}
      />
    </Box>
  );
}
