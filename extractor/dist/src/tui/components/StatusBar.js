import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { horizontalLine } from '../theme.js';
const defaultItems = [
    { key: 'esc', label: 'back' },
    { key: '\u2191\u2193', label: 'navigate' },
    { key: '\u21b5', label: 'select' },
];
export function StatusBar({ items = defaultItems }) {
    const text = items.map(item => `${item.key} ${item.label}`).join('    ');
    return (_jsxs(Box, { flexDirection: "column", marginTop: 1, paddingX: 2, children: [_jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ['  ', horizontalLine(60)] }) }), _jsx(Box, { paddingLeft: 2, children: _jsx(Text, { dimColor: true, children: text }) })] }));
}
