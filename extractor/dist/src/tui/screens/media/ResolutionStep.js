import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
import { symbols } from '../../theme.js';
export function ResolutionStep({ isMovie, episodeCount, defaultResolution, onSelect }) {
    const defaultRes = defaultResolution ?? null;
    const options = (() => {
        const resolutions = [
            { label: '1080p (Full HD)', value: '1080' },
            { label: '720p (HD)', value: '720' },
            { label: '480p (SD)', value: '480' },
            { label: '360p (Low)', value: '360' },
        ].map(r => ({
            label: r.value === defaultRes ? `  ${r.label} [default]` : `  ${r.label}`,
            value: r.value,
        }));
        // Move config default to the top
        if (defaultRes && resolutions.some(r => r.value === defaultRes)) {
            const idx = resolutions.findIndex(r => r.value === defaultRes);
            const [item] = resolutions.splice(idx, 1);
            resolutions.unshift(item);
        }
        return [
            ...resolutions,
            { label: '  Auto (best available)', value: 'auto' },
            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
        ];
    })();
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: isMovie
                        ? 'Select resolution:'
                        : `Select resolution for ${episodeCount} episode(s):` }) }), _jsx(Select, { options: options, onChange: onSelect })] }));
}
