import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';

interface ConfigMenuProps {
  configs: string[];
  defaultName: string | null;
  onSelect: (value: string) => void;
}

export function ConfigMenu({ configs, defaultName, onSelect }: ConfigMenuProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      {configs.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>{`Default: ${defaultName ?? 'none'}  |  ${configs.length} config(s)`}</Text>
          <Text> </Text>
          {configs.map(name => (
            <Text key={name} dimColor>{`    ${name === defaultName ? symbols.star : symbols.bullet}  ${name}`}</Text>
          ))}
        </Box>
      ) : (
        <Box marginBottom={1}><Text dimColor>{'No configurations saved.'}</Text></Box>
      )}

      <Select
        options={[
          { label: '  Create new configuration', value: 'create' },
          ...(configs.length > 0 ? [
            { label: '  Edit configuration', value: 'edit' },
            { label: '  Delete configuration', value: 'delete' },
            { label: '  Set default configuration', value: 'setDefault' },
          ] : []),
          { label: `  ${symbols.arrowRight} Back to main menu`, value: 'back' },
        ]}
        onChange={onSelect}
      />
    </Box>
  );
}
