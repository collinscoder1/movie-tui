import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';
export function MediaTypeStep({ onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Media type:' }) }), _jsx(SelectAll, { options: [
                    { label: '  Movie', value: 'movie' },
                    { label: '  TV Show', value: 'tv' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
