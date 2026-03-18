import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { colors } from '../../theme.js';
export function DeleteConfirmStep({ name, onConfirm }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, color: colors.warning, children: `Delete "${name}"?` }) }), _jsx(SelectAll, { options: [
                    { label: '  Yes, delete', value: 'yes' },
                    { label: '  No, cancel', value: 'no' },
                ], onChange: onConfirm })] }));
}
