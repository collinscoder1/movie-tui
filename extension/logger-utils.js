export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

export function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) {
    return 'unknown size';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatLogsForClipboard(logs, formatTimestamp = formatDate) {
  const summary = `Captured ${logs.length} download event${logs.length === 1 ? '' : 's'}`;
  const output = logs.map((log) => {
    const lines = [];
    const stageLine = `${formatTimestamp(log.timestamp)} · ${log.stage} ${log.url} ${
      log.finalUrl || log.url
    }`;
    lines.push(stageLine);
    lines.push(`mime: ${log.mime ?? 'unknown'}`);
    lines.push(`type: ${log.fileType ?? 'unknown'}`);
    lines.push(`state: ${log.state ?? 'unknown'}`);
    lines.push(`total: ${formatBytes(log.totalBytes)}`);
    lines.push(`received: ${formatBytes(log.bytesReceived)}`);
    if (log.delta?.exists) {
      const deltaState =
        typeof log.delta.state === 'object' ? log.delta.state.current ?? log.delta.state : log.delta.state;
      lines.push(`Δ bytes=${formatBytes(log.delta.bytesReceived)}${deltaState ? ` · state=${deltaState}` : ''}`);
    }
    if (log.referer) {
      lines.push(`referer: ${log.referer}`);
    }
    if (log.userAgent) {
      lines.push(`user-agent: ${log.userAgent}`);
    }
    if (log.cookieHeader) {
      lines.push(`cookies: ${log.cookieHeader}`);
    }
    if (Array.isArray(log.requestHeaders) && log.requestHeaders.length) {
      lines.push(`request headers (${log.requestHeaders.length})`);
      log.requestHeaders.forEach((header) => {
        lines.push(`${header.name}: ${header.value}`);
      });
    }
    return lines.join('\n');
  });
  return [summary, ...output].join('\n\n');
}
