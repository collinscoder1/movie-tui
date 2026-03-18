import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { colors } from '../../theme.js';
export function DeleteConfirmStep({ name, onConfirm }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, color: colors.warning, children: `Delete "${name}"?` }) }), _jsx(Select, { options: [
                    { label: '  Yes, delete', value: 'yes' },
                    { label: '  No, cancel', value: 'no' },
                ], onChange: onConfirm })] }));
}
