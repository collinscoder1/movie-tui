import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function SeasonStep({ seasons, onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select season:' }) }), _jsx(Select, { options: [
                    ...seasons
                        .filter(s => s.season_number > 0)
                        .map(s => ({
                        label: `  Season ${s.season_number}  (${s.episode_count ?? '?'} episodes)`,
                        value: String(s.season_number),
                    })),
                    { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                ], onChange: onSelect })] }));
}
