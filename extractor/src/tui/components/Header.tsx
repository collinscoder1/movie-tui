import React from 'react';
import { Box, Text } from 'ink';
import { symbols, colors, horizontalLine } from '../theme.js';

interface HeaderProps {
  breadcrumb?: string[];
}

export function Header({ breadcrumb = [] }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={2}>
      <Box>
        <Text> </Text>
      </Box>
      <Box>
        <Text bold color={colors.primary}>
          {`  ${symbols.diamond}  Movie Downloader  ${symbols.diamond}`}
        </Text>
      </Box>
      {breadcrumb.length > 0 && (
        <Box>
          <Text dimColor>
            {'  '}{breadcrumb.join(` ${symbols.pointerSmall} `)}
          </Text>
        </Box>
      )}
      <Box>
        <Text dimColor>{'  '}{horizontalLine(60)}</Text>
      </Box>
      <Box>
        <Text> </Text>
      </Box>
    </Box>
  );
}
