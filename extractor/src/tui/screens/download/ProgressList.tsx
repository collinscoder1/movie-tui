import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { DownloadItem, ItemStatus } from '../../stores/downloadStore.js';
import { colors, symbols } from '../../theme.js';

interface ProgressListProps {
  items: DownloadItem[];
  isProcessing: boolean;
}

function statusIcon(status: ItemStatus): string {
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

function statusColor(status: ItemStatus): string | undefined {
  switch (status) {
    case 'success': return colors.success;
    case 'fail': return colors.error;
    case 'skip': return colors.warning;
    case 'fetching':
    case 'queuing': return colors.primary;
    default: return undefined;
  }
}

export function ProgressList({ items, isProcessing }: ProgressListProps) {
  const doneCount = items.filter(i => i.status === 'success' || i.status === 'fail' || i.status === 'skip').length;

  return (
    <Box flexDirection="column" paddingLeft={4}>
      {isProcessing && (
        <Box marginBottom={1}>
          <Spinner label={`Processing ${doneCount + 1}/${items.length}...`} />
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
