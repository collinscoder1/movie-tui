import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';
const unsupportedModes = {
    moviebox: ['url'],
    wco: ['tmdb'],
};
export function ModeStep({ sourceKey, onSelect }) {
    const modeOptions = [
        { label: '  Provide a URL', value: 'url' },
        { label: '  Lookup by TMDb ID', value: 'tmdb' },
        { label: '  Search by name', value: 'name' },
    ].filter(opt => !(unsupportedModes[sourceKey] ?? []).includes(opt.value));
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'How to find media:' }) }), _jsx(SelectAll, { options: [
                    ...modeOptions,
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
