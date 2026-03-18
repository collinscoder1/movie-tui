import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';

interface SelectConfigStepProps {
  title: string;
  configs: string[];
  defaultName?: string | null;
  showStar?: boolean;
  onSelect: (value: string) => void;
}

export function SelectConfigStep({ title, configs, defaultName, showStar, onSelect }: SelectConfigStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{title}</Text></Box>
      <Select
        options={[
          ...configs.map(name => ({
            label: showStar
              ? `  ${name === defaultName ? `${symbols.star} ` : '  '}${name}`
              : `  ${name}`,
            value: name,
          })),
          { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
