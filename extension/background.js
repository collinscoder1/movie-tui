const STORAGE_KEY = 'downloadLogs';
const MAX_LOG_ENTRIES = 250;

const requestMetadataById = new Map();
const urlToRequestMetadata = new Map();

function getHeaderValue(headers, key) {
  if (!headers) {
    return undefined;
  }
  const match = headers.find((header) => header.name.toLowerCase() === key.toLowerCase());
  return match ? match.value : undefined;
}

function normalizeLogItem(item, delta, stage) {
  return {
    id: item.id,
    stage,
    url: item.finalUrl || item.url,
    filename: item.filename,
    mime: item.mime,
    fileType: item.mime,
    totalBytes: item.totalBytes,
    bytesReceived: item.bytesReceived,
    state: item.state,
    paused: item.paused,
    danger: item.danger,
    error: item.error,
    startTime: item.startTime,
    endTime: item.endTime,
    delta: delta ? normalizeDelta(delta) : undefined,
    referer: urlToRequestMetadata.get(item.url)?.referer,
    userAgent: urlToRequestMetadata.get(item.url)?.userAgent,
    cookieHeader: urlToRequestMetadata.get(item.url)?.cookie,
    requestHeaders: urlToRequestMetadata.get(item.url)?.headers,
    timestamp: Date.now()
  };
}

function normalizeDelta(delta) {
  return {
    state: delta.state,
    bytesReceived: delta.bytesReceived,
    totalBytes: delta.totalBytes,
    paused: delta.paused,
    danger: delta.danger,
    error: delta.error,
    exists: Object.keys(delta).length > 0
  };
}

function persistLog(log) {
  chrome.storage.local.get({ [STORAGE_KEY]: [] }, (result) => {
  const current = result[STORAGE_KEY] ?? [];
    const next = [log, ...current].slice(0, MAX_LOG_ENTRIES);
    chrome.storage.local.set({ [STORAGE_KEY]: next }, () => {
      console.debug('Download log stored', log);
    });
  });
}

function logDownload(item, delta, stage) {
  const record = normalizeLogItem(item, delta, stage);
  persistLog(record);
}

function captureRequest(details) {
  const headers = details.requestHeaders ?? [];
  const entry = {
    url: details.url,
    headers,
    referer: getHeaderValue(headers, 'referer') ?? details.initiator ?? '',
    userAgent: getHeaderValue(headers, 'user-agent') ?? '',
    cookie: getHeaderValue(headers, 'cookie') ?? '',
    timestamp: Date.now()
  };
  requestMetadataById.set(details.requestId, entry);
  urlToRequestMetadata.set(details.url, entry);
  setTimeout(() => {
    const current = urlToRequestMetadata.get(details.url);
    if (current === entry) {
      urlToRequestMetadata.delete(details.url);
    }
    requestMetadataById.delete(details.requestId);
  }, 60_000);
}

chrome.downloads.onCreated.addListener((item) => {
  logDownload(item, null, 'created');
});

chrome.downloads.onChanged.addListener((delta) => {
  chrome.downloads.search({ id: delta.id }, (items) => {
    if (!items || !items.length) {
      return;
    }
    logDownload(items[0], delta, 'changed');
  });
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  captureRequest,
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ [STORAGE_KEY]: [] });
});
