import React from 'react';
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';

interface ResolutionStepProps {
  isMovie: boolean;
  episodeCount: number;
  defaultResolution: string | null | undefined;
  onSelect: (value: string) => void;
}

export function ResolutionStep({ isMovie, episodeCount, defaultResolution, onSelect }: ResolutionStepProps) {
  const defaultRes = defaultResolution ?? null;

  const options = (() => {
    const resolutions = [
      { label: '1080p (Full HD)', value: '1080' },
      { label: '720p (HD)', value: '720' },
      { label: '480p (SD)', value: '480' },
      { label: '360p (Low)', value: '360' },
    ].map(r => ({
      label: r.value === defaultRes ? `  ${r.label} [default]` : `  ${r.label}`,
      value: r.value,
    }));
    if (defaultRes && resolutions.some(r => r.value === defaultRes)) {
      const idx = resolutions.findIndex(r => r.value === defaultRes);
      const [item] = resolutions.splice(idx, 1);
      resolutions.unshift(item);
    }
    return [
      ...resolutions,
      { label: '  Auto (best available)', value: 'auto' },
      { label: `  ${symbols.arrowRight} Back`, value: '_back' },
    ];
  })();

  return (
    <Box flexDirection="column" paddingLeft={4}>
      <Box marginBottom={1}><Text bold>
        {isMovie
          ? 'Select resolution:'
          : `Select resolution for ${episodeCount} episode(s):`}
      </Text></Box>
      <SelectAll
        options={options}
        onChange={onSelect}
      />
    </Box>
  );
}
