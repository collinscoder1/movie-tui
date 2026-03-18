import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';
export function EpisodeInputStep({ onSubmit }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Enter episode range (e.g., 1-3,5,7-10):' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: "1-3,5", onSubmit: onSubmit })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] }));
}
