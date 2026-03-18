import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { DownloadItemStatus } from '../../download-core.js';
import { colors, symbols } from '../../theme.js';

interface ProgressListProps {
  items: DownloadItemStatus[];
  currentIndex: number;
  totalCount: number;
  isProcessing: boolean;
}

function statusIcon(status: DownloadItemStatus['status']): string {
  switch (status) {
    case 'pending': return symbols.dot;
    case 'fetching': return symbols.ellipsis;
    case 'selecting': return '?';
    case 'queuing': return symbols.ellipsis;
    case 'success': return symbols.check;
    case 'fail': return symbols.cross;
    case 'skip': return symbols.pointerSmall;
  }
}

function statusColor(status: DownloadItemStatus['status']): string | undefined {
  switch (status) {
    case 'success': return colors.success;
    case 'fail': return colors.error;
    case 'skip': return colors.warning;
    case 'fetching':
    case 'queuing': return colors.primary;
    default: return undefined;
  }
}

export function ProgressList({ items, currentIndex, totalCount, isProcessing }: ProgressListProps) {
  return (
    <Box flexDirection="column" paddingLeft={4}>
      {isProcessing && (
        <Box marginBottom={1}>
          <Spinner label={`Processing ${currentIndex + 1}/${totalCount}...`} />
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        {items.map((item, i) => (
          <Box key={i}>
            <Text color={statusColor(item.status)}>{`    ${statusIcon(item.status)}  `}</Text>
            <Text color={statusColor(item.status)}>{item.descriptor.description}</Text>
            {item.message && (
              <Text dimColor>{`  ${symbols.pointerSmall} ${item.message}`}</Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
