import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function ResultsStep({ results, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Found ${results.length} results:` }) }), _jsx(Select, { options: [
                    ...results.map((r, i) => ({
                        label: `  ${r.title} (${r.year})`,
                        value: String(i),
                    })),
                    { label: `  ${symbols.arrowRight} Back to search`, value: '_back' },
                ], onChange: onSelect })] }));
}
