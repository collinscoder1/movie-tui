import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function ConfigResolutionStep({ onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Preferred resolution:' }) }), _jsx(Select, { options: [
                    { label: '  1080p (Full HD)', value: '1080' },
                    { label: '  720p (HD)', value: '720' },
                    { label: '  480p (SD)', value: '480' },
                    { label: '  360p (Low)', value: '360' },
                    { label: '  Auto (best available)', value: 'auto' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
