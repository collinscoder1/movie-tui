import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { MultiSelect } from '@inkjs/ui';
export function EpisodeSelectStep({ episodes, onSubmit }) {
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select episodes (space to toggle, enter to confirm):' }) }), _jsx(MultiSelect, { options: episodes.map(ep => {
                    const title = ep.name;
                    const label = title
                        ? `  E${String(ep.episode_number).padStart(2, '0')} - ${title}`
                        : `  E${String(ep.episode_number).padStart(2, '0')}`;
                    return { label, value: String(ep.episode_number) };
                }), onSubmit: onSubmit }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Space to toggle, Enter to confirm, Esc to go back' }) })] }));
}
