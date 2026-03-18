import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { colors, symbols } from '../../theme.js';
function statusIcon(status) {
    switch (status) {
        case 'pending': return symbols.dot;
        case 'fetching': return symbols.ellipsis;
        case 'selecting': return '?';
        case 'queuing': return symbols.ellipsis;
        case 'success': return symbols.check;
        case 'fail': return symbols.cross;
        case 'skip': return symbols.pointerSmall;
    }
}
function statusColor(status) {
    switch (status) {
        case 'success': return colors.success;
        case 'fail': return colors.error;
        case 'skip': return colors.warning;
        case 'fetching':
        case 'queuing': return colors.primary;
        default: return undefined;
    }
}
export function ProgressList({ items, isProcessing }) {
    const doneCount = items.filter(i => i.status === 'success' || i.status === 'fail' || i.status === 'skip').length;
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [isProcessing && (_jsx(Box, { marginBottom: 1, children: _jsx(Spinner, { label: `Processing ${doneCount + 1}/${items.length}...` }) })), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: items.map((item, i) => (_jsxs(Box, { children: [_jsx(Text, { color: statusColor(item.status), children: `    ${statusIcon(item.status)}  ` }), _jsx(Text, { color: statusColor(item.status), children: item.descriptor.description }), item.message && (_jsx(Text, { dimColor: true, children: `  ${symbols.pointerSmall} ${item.message}` }))] }, i))) })] }));
}
