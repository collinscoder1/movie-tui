import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select, TextInput } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';
export function NameStep({ isCustom, onSelect, onCustomSubmit }) {
    if (isCustom) {
        return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Enter configuration name:' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: "my-config", onSubmit: onCustomSubmit })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Choose a name:' }) }), _jsx(Select, { options: [
                    { label: '  default', value: 'default' },
                    { label: '  high-quality', value: 'high-quality' },
                    { label: '  mobile', value: 'mobile' },
                    { label: '  Custom name...', value: 'custom' },
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
