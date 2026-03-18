import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { colors, symbols, horizontalLine } from '../../theme.js';

interface SummaryStepProps {
  success: number;
  fail: number;
  skip: number;
  onDone: () => void;
}

export function SummaryStep({ success, fail, skip, onDone }: SummaryStepProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{'  '}{horizontalLine(50)}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column" paddingLeft={2}>
        <Text bold>{'Summary'}</Text>
        <Text> </Text>
        <Text color={colors.success}>{`    ${symbols.check}  Queued:  ${success}`}</Text>
        <Text color={colors.error}>{`    ${symbols.cross}  Failed:  ${fail}`}</Text>
        <Text color={colors.warning}>{`    ${symbols.pointerSmall}  Skipped: ${skip}`}</Text>
      </Box>
      <Box marginTop={1}>
        <SelectAll
          options={[
            { label: `  ${symbols.arrowRight} Back to main menu`, value: 'menu' },
          ]}
          onChange={() => onDone()}
        />
      </Box>
    </Box>
  );
}
