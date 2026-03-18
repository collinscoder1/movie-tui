import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function SubtitleStep({ configName, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Configure "${configName}": Subtitle language` }) }), _jsx(Select, { options: [
                    { label: '  No subtitles', value: 'none' },
                    { label: '  English', value: 'English' },
                    { label: '  Spanish', value: 'Spanish' },
                    { label: '  Arabic', value: 'Arabic' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
