import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function ConfirmStep({ descriptors, onConfirm }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Queue ${descriptors.length} item(s) for download?` }) }), _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [descriptors.slice(0, 10).map((d, i) => (_jsx(Text, { dimColor: true, children: `    ${symbols.bullet}  ${d.description}` }, i))), descriptors.length > 10 && (_jsx(Text, { dimColor: true, children: `    ... and ${descriptors.length - 10} more` }))] }), _jsx(Select, { options: [
                    { label: `  ${symbols.check} Start downloading`, value: 'start' },
                    { label: `  ${symbols.cross} Cancel`, value: 'cancel' },
                ], onChange: onConfirm })] }));
}
