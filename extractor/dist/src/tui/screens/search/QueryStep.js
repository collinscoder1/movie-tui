import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';
export function QueryStep({ mode, onSubmit }) {
    const label = mode === 'url' ? 'Enter URL:' : mode === 'tmdb' ? 'Enter TMDb ID:' : 'Enter search query:';
    const placeholder = mode === 'url' ? 'https://dl.vidsrc.vip/...' : mode === 'tmdb' ? '12345' : 'movie or show name';
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: label }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: placeholder, onSubmit: onSubmit })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] }));
}
