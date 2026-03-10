import { formatDate, formatBytes, formatLogsForClipboard } from './logger-utils.js';

const logList = document.getElementById('logList');
const summary = document.getElementById('summary');
const refreshBtn = document.getElementById('refresh');
const copyBtn = document.getElementById('copy');
const clearBtn = document.getElementById('clear');
const STORAGE_KEY = 'downloadLogs';

function readLogs() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [STORAGE_KEY]: [] }, (result) => {
      resolve(result[STORAGE_KEY]);
    });
  });
}

async function render() {
  const logs = (await readLogs()) ?? [];
  summary.textContent = logs.length
    ? `Captured ${logs.length} download event${logs.length === 1 ? '' : 's'}`
    : 'No downloads intercepted yet.';
  logList.innerHTML = '';
  logs.forEach((log) => {
    const fields = [];
    if (log.mime) {
      fields.push(`mime: ${log.mime}`);
    }
    if (log.fileType) {
      fields.push(`type: ${log.fileType}`);
    }
    fields.push(`state: ${log.state || 'unknown'}`);
    fields.push(`total: ${formatBytes(log.totalBytes)}`);
    fields.push(`received: ${formatBytes(log.bytesReceived)}`);
    if (log.delta?.exists) {
      const deltaState =
        typeof log.delta.state === 'object'
          ? log.delta.state.current ?? log.delta.state
          : log.delta.state;
      fields.push(
        `Δ bytes=${formatBytes(log.delta.bytesReceived)}${deltaState ? ` · state=${deltaState}` : ''}`
      );
    }
    if (log.referer) {
      fields.push(`referer: ${log.referer}`);
    }
    if (log.userAgent) {
      fields.push(`user-agent: ${log.userAgent}`);
    }
    if (log.cookieHeader) {
      fields.push(`cookies: ${log.cookieHeader}`);
    }
    const headerRows = log.requestHeaders?.map((header) => `${header.name}: ${header.value}`) ?? [];
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="meta">${formatDate(log.timestamp)} · ${log.stage}</span>
      <strong>${log.filename || log.url}</strong>
      <span>${log.url}</span>
      <div class="meta-details">
        ${fields.map((field) => `<span>${field}</span>`).join('')}
        ${headerRows.length ? `<details><summary>request headers (${headerRows.length})</summary><pre>${headerRows.join('\n')}</pre></details>` : ''}
      </div>
    `;
    logList.appendChild(li);
  });
}

refreshBtn.addEventListener('click', () => render());
copyBtn.addEventListener('click', async () => {
  const logs = (await readLogs()) ?? [];
  const text = formatLogsForClipboard(logs);
  await navigator.clipboard.writeText(text);
});
clearBtn.addEventListener('click', () => {
  chrome.storage.local.set({ [STORAGE_KEY]: [] }, render);
});

document.addEventListener('DOMContentLoaded', render);
