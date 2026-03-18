import React from 'react';
import { Box, Text } from 'ink';
import { symbols, horizontalLine } from '../theme.js';

interface StatusBarProps {
  items?: Array<{ key: string; label: string }>;
}

const defaultItems = [
  { key: 'esc', label: 'back' },
  { key: '\u2191\u2193', label: 'navigate' },
  { key: '\u21b5', label: 'select' },
];

export function StatusBar({ items = defaultItems }: StatusBarProps) {
  const text = items.map(item => `${item.key} ${item.label}`).join('    ');
  return (
    <Box flexDirection="column" marginTop={1} paddingX={2}>
      <Box>
        <Text dimColor>{'  '}{horizontalLine(60)}</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor>{text}</Text>
      </Box>
    </Box>
  );
}
