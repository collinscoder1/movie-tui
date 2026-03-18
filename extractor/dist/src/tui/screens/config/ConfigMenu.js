import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';
export function ConfigMenu({ configs, defaultName, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [configs.length > 0 ? (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { dimColor: true, children: `Default: ${defaultName ?? 'none'}  |  ${configs.length} config(s)` }), _jsx(Text, { children: " " }), configs.map(name => (_jsx(Text, { dimColor: true, children: `    ${name === defaultName ? symbols.star : symbols.bullet}  ${name}` }, name)))] })) : (_jsx(Box, { marginBottom: 1, children: _jsx(Text, { dimColor: true, children: 'No configurations saved.' }) })), _jsx(SelectAll, { options: [
                    { label: '  Create new configuration', value: 'create' },
                    ...(configs.length > 0 ? [
                        { label: '  Edit configuration', value: 'edit' },
                        { label: '  Delete configuration', value: 'delete' },
                        { label: '  Set default configuration', value: 'setDefault' },
                    ] : []),
                    { label: `  ${symbols.arrowRight} Back to main menu`, value: 'back' },
                ], onChange: onSelect })] }));
}
