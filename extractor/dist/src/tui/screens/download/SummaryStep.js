import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { colors, symbols, horizontalLine } from '../../theme.js';
export function SummaryStep({ success, fail, skip, onDone }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ['  ', horizontalLine(50)] }) }), _jsxs(Box, { marginTop: 1, flexDirection: "column", paddingLeft: 2, children: [_jsx(Text, { bold: true, children: 'Summary' }), _jsx(Text, { children: " " }), _jsx(Text, { color: colors.success, children: `    ${symbols.check}  Queued:  ${success}` }), _jsx(Text, { color: colors.error, children: `    ${symbols.cross}  Failed:  ${fail}` }), _jsx(Text, { color: colors.warning, children: `    ${symbols.pointerSmall}  Skipped: ${skip}` })] }), _jsx(Box, { marginTop: 1, children: _jsx(SelectAll, { options: [
                        { label: `  ${symbols.arrowRight} Back to main menu`, value: 'menu' },
                    ], onChange: () => onDone() }) })] }));
}
