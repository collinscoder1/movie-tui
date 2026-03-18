import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { EpisodeDescriptor } from '../../../source/index.js';
import { symbols } from '../../theme.js';

interface ConfirmStepProps {
  descriptors: EpisodeDescriptor[];
  onConfirm: (value: string) => void;
}

export function ConfirmStep({ descriptors, onConfirm }: ConfirmStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>
        {`Queue ${descriptors.length} item(s) for download?`}
      </Text></Box>
      <Box flexDirection="column" marginBottom={1}>
        {descriptors.slice(0, 10).map((d, i) => (
          <Text key={i} dimColor>{`    ${symbols.bullet}  ${d.description}`}</Text>
        ))}
        {descriptors.length > 10 && (
          <Text dimColor>{`    ... and ${descriptors.length - 10} more`}</Text>
        )}
      </Box>
      <SelectAll
        options={[
          { label: `  ${symbols.check} Start downloading`, value: 'start' },
          { label: `  ${symbols.cross} Cancel`, value: 'cancel' },
        ]}
        onChange={onConfirm}
      />
    </Box>
  );
}
