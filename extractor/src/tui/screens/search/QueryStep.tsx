import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';

type SearchMode = 'url' | 'tmdb' | 'name';

interface QueryStepProps {
  mode: SearchMode;
  onSubmit: (value: string) => void;
}

export function QueryStep({ mode, onSubmit }: QueryStepProps) {
  const label = mode === 'url' ? 'Enter URL:' : mode === 'tmdb' ? 'Enter TMDb ID:' : 'Enter search query:';
  const placeholder = mode === 'url' ? 'https://dl.vidsrc.vip/...' : mode === 'tmdb' ? '12345' : 'movie or show name';

  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>{label}</Text></Box>
      <Box>
        <Text color={colors.primary}>{`${symbols.pointer} `}</Text>
        <TextInput
          placeholder={placeholder}
          onSubmit={onSubmit}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{'Press Enter to submit, Esc to go back'}</Text>
      </Box>
    </Box>
  );
}
