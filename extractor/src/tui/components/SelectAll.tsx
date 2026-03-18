import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';

interface SelectAllProps {
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  defaultValue?: string;
  isDisabled?: boolean;
  visibleOptionCount?: number;
  highlightText?: string;
}

export function SelectAll({ 
  options, 
  onChange, 
  defaultValue, 
  isDisabled,
  visibleOptionCount = 5,
  highlightText,
}: SelectAllProps) {
  const hiddenCount = Math.max(0, options.length - visibleOptionCount);
  const showScrollHint = hiddenCount > 0;
  
  return (
    <Box flexDirection="column">
      <Select
        options={options}
        onChange={onChange}
        defaultValue={defaultValue}
        isDisabled={isDisabled}
        visibleOptionCount={visibleOptionCount}
        highlightText={highlightText}
      />
      {showScrollHint && (
        <Box paddingLeft={4} marginTop={1}>
          <Text dimColor>{`Use ↑↓ to scroll • ${hiddenCount} more below`}</Text>
        </Box>
      )}
    </Box>
  );
}
