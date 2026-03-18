import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { colors, symbols } from '../../theme.js';

interface VerifyStepProps {
  text: string;
  onBack: () => void;
}

export function VerifyStep({ text, onBack }: VerifyStepProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1} flexDirection="column">
        {text.split('\n').map((line, i) => {
          const isCheck = line.includes(symbols.check);
          const isCross = line.includes(symbols.cross);
          return (
            <Text key={i} color={isCheck ? colors.success : isCross ? colors.error : undefined}>
              {'  '}{line}
            </Text>
          );
        })}
      </Box>
      <SelectAll
        options={[
          { label: `  ${symbols.arrowRight} Back to menu`, value: '_back' },
        ]}
        onChange={() => onBack()}
      />
    </Box>
  );
}
