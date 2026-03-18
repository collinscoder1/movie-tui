import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
export function QualityPickStep({ description, entries, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Preferred quality not available for: ${description}` }) }), _jsx(Box, { marginBottom: 1, children: _jsx(Text, { children: 'Choose from available qualities:' }) }), _jsx(SelectAll, { options: [
                    ...entries.map((e, i) => ({
                        label: `  ${e.format} ${e.resolution || 'unknown'} - ${e.size}`,
                        value: String(i),
                    })),
                    { label: '  Skip this item', value: '_skip' },
                ], onChange: onSelect })] }));
}
