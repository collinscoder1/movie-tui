import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { SelectAll } from '../../components/SelectAll.js';
import { colors, symbols } from '../../theme.js';
export function PathStep({ isInput, onSelect, onInputSubmit }) {
    if (isInput) {
        return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Enter download base path:' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: "/home/user/Downloads", onSubmit: onInputSubmit })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Download path:' }) }), _jsx(SelectAll, { options: [
                    { label: '  Use AB Download Manager default', value: 'default' },
                    { label: '  Specify custom path', value: 'custom' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
