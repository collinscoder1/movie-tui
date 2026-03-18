import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Select, Spinner } from '@inkjs/ui';
import { loadDefaultConfig } from '../../../config.js';
import { colors, symbols } from '../../theme.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
export function MainMenu({ onSearch, onConfig }) {
    const { exit } = useApp();
    const [config, setConfig] = useState(null);
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
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, {}), _jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: "Loading configuration..." }) })] }));
    }
    const options = [];
    if (config?.downloadPath) {
        options.push({ label: `  ${symbols.pointerSmall}  Search & Download`, value: 'search' });
    }
    options.push({ label: `  ${symbols.pointerSmall}  Manage Configurations`, value: 'config' }, { label: `  ${symbols.pointerSmall}  Quit`, value: 'quit' });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, {}), config ? (_jsxs(Box, { flexDirection: "column", marginBottom: 1, paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { children: ['Active config: ', _jsx(Text, { color: colors.primary, bold: true, children: config.name })] }) }), _jsx(Text, { dimColor: true, children: `    Path:       ${config.downloadPath ?? 'not set'}` }), _jsx(Text, { dimColor: true, children: `    Format:     ${config.preferredFormat}` }), _jsx(Text, { dimColor: true, children: `    Resolution: ${config.preferredResolution}` }), config.subtitleLanguage && (_jsx(Text, { dimColor: true, children: `    Subtitles:  ${config.subtitleLanguage}` }))] })) : (_jsx(Box, { marginBottom: 1, paddingLeft: 4, children: _jsx(Text, { color: colors.warning, children: `${symbols.bullet} No configuration found. Create one to start downloading.` }) })), _jsx(Box, { paddingLeft: 4, children: _jsx(Select, { options: options, onChange: (value) => {
                        if (value === 'search' && config)
                            onSearch(config);
                        else if (value === 'config')
                            onConfig();
                        else if (value === 'quit')
                            exit();
                    } }) }), _jsx(StatusBar, {})] }));
}
