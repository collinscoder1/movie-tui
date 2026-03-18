import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';
export function EpisodesStep({ seasonNumber, episodes, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Season ${seasonNumber} - ${episodes.length} episodes:` }) }), _jsx(SelectAll, { options: [
                    { label: '  Select all episodes', value: 'all' },
                    { label: '  Pick specific episodes (space to toggle)', value: 'select' },
                    { label: '  Enter episode range (e.g., 1-3,5)', value: 'custom' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect }), _jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: 'Available episodes:' }), _jsx(Box, { flexWrap: "wrap", width: 60, marginTop: 1, children: episodes.map(ep => (_jsx(Box, { width: 14, children: _jsx(Text, { dimColor: true, children: `  E${String(ep.episode_number).padStart(2, '0')} ` }) }, ep.episode_number))) })] })] }));
}
