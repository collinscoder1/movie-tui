import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function SourceStep({ onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select content source:' }) }), _jsx(Select, { options: [
                    { label: '  VidSrc (vidsrc.vip)', value: 'vidsrc' },
                    { label: '  Moviebox', value: 'moviebox' },
                    { label: '  WCO (wcoflix.tv)', value: 'wco' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
