import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { symbols, colors, horizontalLine } from '../theme.js';
export function Header({ breadcrumb = [] }) {
    return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, paddingX: 2, children: [_jsx(Box, { children: _jsx(Text, { children: " " }) }), _jsx(Box, { children: _jsx(Text, { bold: true, color: colors.primary, children: `  ${symbols.diamond}  Movie Downloader  ${symbols.diamond}` }) }), breadcrumb.length > 0 && (_jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ['  ', breadcrumb.join(` ${symbols.pointerSmall} `)] }) })), _jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ['  ', horizontalLine(60)] }) }), _jsx(Box, { children: _jsx(Text, { children: " " }) })] }));
}
