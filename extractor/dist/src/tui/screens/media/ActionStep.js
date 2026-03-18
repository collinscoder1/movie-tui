import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function ActionStep({ isMovie, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'What would you like to do?' }) }), _jsx(Select, { options: [
                    { label: isMovie ? '  Download movie' : '  Download episodes', value: 'download' },
                    { label: '  Verify existing downloads', value: 'verify' },
                    { label: isMovie ? '  Download if missing' : '  Download missing only', value: 'undownloaded' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
