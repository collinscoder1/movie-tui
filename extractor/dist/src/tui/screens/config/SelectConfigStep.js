import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { SelectAll } from '../../components/SelectAll.js';
import { symbols } from '../../theme.js';
export function SelectConfigStep({ title, configs, defaultName, showStar, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: title }) }), _jsx(SelectAll, { options: [
                    ...configs.map(name => ({
                        label: showStar
                            ? `  ${name === defaultName ? `${symbols.star} ` : '  '}${name}`
                            : `  ${name}`,
                        value: name,
                    })),
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
