import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';
export function SelectAll({ options, onChange, defaultValue, isDisabled, visibleOptionCount = 5, highlightText, }) {
    const hiddenCount = Math.max(0, options.length - visibleOptionCount);
    const showScrollHint = hiddenCount > 0;
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Select, { options: options, onChange: onChange, defaultValue: defaultValue, isDisabled: isDisabled, visibleOptionCount: visibleOptionCount, highlightText: highlightText }), showScrollHint && (_jsx(Box, { paddingLeft: 4, marginTop: 1, children: _jsx(Text, { dimColor: true, children: `Use ↑↓ to scroll • ${hiddenCount} more below` }) }))] }));
}
