// Theme constants for the Ink TUI

export const colors = {
  primary: 'cyan',
  secondary: 'magenta',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  muted: 'gray',
  accent: 'blue',
} as const;

export const symbols = {
  check: '\u2713',
  cross: '\u2717',
  bullet: '\u25cf',
  pointer: '\u276f',
  pointerSmall: '\u203a',
  line: '\u2500',
  corner: '\u2514',
  tee: '\u251c',
  verticalLine: '\u2502',
  topLeft: '\u256d',
  topRight: '\u256e',
  bottomLeft: '\u2570',
  bottomRight: '\u256f',
  diamond: '\u25c6',
  star: '\u2605',
  arrowRight: '\u2192',
  arrowDown: '\u2193',
  ellipsis: '\u2026',
  dot: '\u00b7',
} as const;

export function horizontalLine(width: number): string {
  return symbols.line.repeat(width);
}
