import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { colors, symbols } from '../../theme.js';
export function VerifyStep({ text, onBack }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, flexDirection: "column", children: text.split('\n').map((line, i) => {
                    const isCheck = line.includes(symbols.check);
                    const isCross = line.includes(symbols.cross);
                    return (_jsxs(Text, { color: isCheck ? colors.success : isCross ? colors.error : undefined, children: ['  ', line] }, i));
                }) }), _jsx(SelectAll, { options: [
                    { label: `  ${symbols.arrowRight} Back to menu`, value: '_back' },
                ], onChange: () => onBack() })] }));
}
