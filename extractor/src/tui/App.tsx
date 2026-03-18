import React, { useState, useCallback } from 'react';
import { Box } from 'ink';
import { Config } from '../config.js';
import { MediaSource, EpisodeDescriptor } from '../source/index.js';
import { SourceTvSeasonInfo, SourceMovieInfo } from '../source/types.js';
import { MainMenu } from './screens/main-menu/index.js';
import { SearchScreen } from './screens/search/index.js';
import { MediaScreen } from './screens/media/index.js';
import { DownloadScreen } from './screens/download/index.js';
import { ConfigScreen } from './screens/config/index.js';

type Screen = 'menu' | 'search' | 'media' | 'download' | 'config';

interface AppState {
  screen: Screen;
  config: Config | null;
  source: MediaSource | null;
  mediaInfo: SourceTvSeasonInfo | SourceMovieInfo | null;
  descriptors: EpisodeDescriptor[];
  resolution: string | null;
}

export function App() {
  const [state, setState] = useState<AppState>({
    screen: 'menu',
    config: null,
    source: null,
    mediaInfo: null,
    descriptors: [],
    resolution: null,
  });

  const goToMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      screen: 'menu',
      source: null,
      mediaInfo: null,
      descriptors: [],
      resolution: null,
    }));
  }, []);

  const goToSearch = useCallback((config: Config) => {
    setState(prev => ({
      ...prev,
      screen: 'search',
      config,
      source: null,
      mediaInfo: null,
    }));
  }, []);

  const goToConfig = useCallback(() => {
    setState(prev => ({ ...prev, screen: 'config' }));
  }, []);

  const goToMedia = useCallback((info: SourceTvSeasonInfo | SourceMovieInfo, source: MediaSource, config: Config) => {
    setState(prev => ({
      ...prev,
      screen: 'media',
      mediaInfo: info,
      source,
      config,
    }));
  }, []);

  const goToDownload = useCallback((descriptors: EpisodeDescriptor[], resolution: string | null) => {
    setState(prev => ({
      ...prev,
      screen: 'download',
      descriptors,
      resolution,
    }));
  }, []);

  return (
    <Box flexDirection="column">
      {state.screen === 'menu' && (
        <MainMenu
          onSearch={goToSearch}
          onConfig={goToConfig}
        />
      )}

      {state.screen === 'search' && state.config && (
        <SearchScreen
          config={state.config}
          onMediaSelected={goToMedia}
          onBack={goToMenu}
        />
      )}

      {state.screen === 'media' && state.mediaInfo && state.source && state.config && (
        <MediaScreen
          mediaInfo={state.mediaInfo}
          source={state.source}
          config={state.config}
          onDownload={goToDownload}
          onBack={() => setState(prev => ({ ...prev, screen: 'search' }))}
        />
      )}

      {state.screen === 'download' && state.source && state.config && (
        <DownloadScreen
          descriptors={state.descriptors}
          resolution={state.resolution}
          source={state.source}
          config={state.config}
          onDone={goToMenu}
          onBack={() => setState(prev => ({ ...prev, screen: 'media' }))}
        />
      )}

      {state.screen === 'config' && (
        <ConfigScreen onBack={goToMenu} />
      )}
    </Box>
  );
}
