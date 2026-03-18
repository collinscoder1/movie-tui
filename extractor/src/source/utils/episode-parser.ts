export function parseEpisodeInput(value: string, available: number[]): number[] {
  const normalized = value
    .split(',')
    .flatMap((part) => {
      const trimmed = part.trim();
      if (!trimmed) {
        return [];
      }
      if (trimmed.includes('-')) {
        const [startRaw, endRaw] = trimmed.split('-');
        const start = Number(startRaw.trim());
        const end = Number(endRaw.trim());
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
          return [];
        }
        return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
      }
      const num = Number(trimmed);
      return Number.isFinite(num) ? [num] : [];
    })
    .filter((num) => available.includes(num));
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}
