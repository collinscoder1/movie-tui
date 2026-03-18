import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { SelectAll } from '../../components/SelectAll.js';
import { loadDefaultConfig, Config } from '../../../config.js';
import { colors, symbols } from '../../theme.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';

interface MainMenuProps {
  onSearch: (config: Config) => void;
  onConfig: () => void;
}

export function MainMenu({ onSearch, onConfig }: MainMenuProps) {
  const { exit } = useApp();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDefaultConfig().then(c => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      exit();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column">
        <Header />
        <Box paddingLeft={4}>
          <Spinner label="Loading configuration..." />
        </Box>
      </Box>
    );
  }

  const options: Array<{ label: string; value: string }> = [];
  if (config?.downloadPath) {
    options.push({ label: `  ${symbols.pointerSmall}  Search & Download`, value: 'search' });
  }
  options.push(
    { label: `  ${symbols.pointerSmall}  Manage Configurations`, value: 'config' },
    { label: `  ${symbols.pointerSmall}  Quit`, value: 'quit' },
  );

  return (
    <Box flexDirection="column">
      <Header />

      {config ? (
        <Box flexDirection="column" marginBottom={1} paddingLeft={4}>
          <Box marginBottom={1}>
            <Text>
              {'Active config: '}
              <Text color={colors.primary} bold>{config.name}</Text>
            </Text>
          </Box>
          <Text dimColor>{`    Path:       ${config.downloadPath ?? 'not set'}`}</Text>
          <Text dimColor>{`    Format:     ${config.preferredFormat}`}</Text>
          <Text dimColor>{`    Resolution: ${config.preferredResolution}`}</Text>
          {config.subtitleLanguage && (
            <Text dimColor>{`    Subtitles:  ${config.subtitleLanguage}`}</Text>
          )}
        </Box>
      ) : (
        <Box marginBottom={1} paddingLeft={4}>
          <Text color={colors.warning}>
            {`${symbols.bullet} No configuration found. Create one to start downloading.`}
          </Text>
        </Box>
      )}

      <Box paddingLeft={4}>
        <SelectAll
          options={options}
          onChange={(value) => {
            if (value === 'search' && config) onSearch(config);
            else if (value === 'config') onConfig();
            else if (value === 'quit') exit();
          }}
        />
      </Box>

      <StatusBar />
    </Box>
  );
}
