import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Box } from 'ink';
import { MainMenu } from './screens/main-menu/index.js';
import { SearchScreen } from './screens/search/index.js';
import { MediaScreen } from './screens/media/index.js';
import { DownloadScreen } from './screens/download/index.js';
import { ConfigScreen } from './screens/config/index.js';
export function App() {
    const [state, setState] = useState({
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
    const goToSearch = useCallback((config) => {
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
    const goToMedia = useCallback((info, source, config) => {
        setState(prev => ({
            ...prev,
            screen: 'media',
            mediaInfo: info,
            source,
            config,
        }));
    }, []);
    const goToDownload = useCallback((descriptors, resolution) => {
        setState(prev => ({
            ...prev,
            screen: 'download',
            descriptors,
            resolution,
        }));
    }, []);
    return (_jsxs(Box, { flexDirection: "column", children: [state.screen === 'menu' && (_jsx(MainMenu, { onSearch: goToSearch, onConfig: goToConfig })), state.screen === 'search' && state.config && (_jsx(SearchScreen, { config: state.config, onMediaSelected: goToMedia, onBack: goToMenu })), state.screen === 'media' && state.mediaInfo && state.source && state.config && (_jsx(MediaScreen, { mediaInfo: state.mediaInfo, source: state.source, config: state.config, onDownload: goToDownload, onBack: () => setState(prev => ({ ...prev, screen: 'search' })) })), state.screen === 'download' && state.source && state.config && (_jsx(DownloadScreen, { descriptors: state.descriptors, resolution: state.resolution, source: state.source, config: state.config, onDone: goToMenu, onBack: () => setState(prev => ({ ...prev, screen: 'media' })) })), state.screen === 'config' && (_jsx(ConfigScreen, { onBack: goToMenu }))] }));
}
