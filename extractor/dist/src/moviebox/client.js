const BASE_URL = 'https://h5-api.aoneroom.com';
function buildHeaders(locale) {
    const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    return {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-request-lang': locale,
        'x-client-info': JSON.stringify({ timezone })
    };
}
async function doFetch(path, options) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const url = `${BASE_URL}${path}`;
    const method = options.method ?? 'GET';
    const headers = buildHeaders(options.locale ?? 'en');
    const init = {
        method,
        headers,
        signal: options.signal
    };
    if (method !== 'GET' && options.body !== undefined) {
        init.body = JSON.stringify(options.body);
    }
    const response = await fetchImpl(url, init);
    if (!response.ok) {
        throw new Error(`Moviebox API ${response.status}: ${response.statusText}`);
    }
    const payload = await response.json();
    if (payload?.code !== 0) {
        throw new Error(`Moviebox API error: ${payload?.message ?? 'unknown'}`);
    }
    return payload;
}
export async function movieboxPost(path, body, opts = {}) {
    return doFetch(path, { ...opts, method: 'POST', body });
}
export async function movieboxGet(path, opts = {}) {
    return doFetch(path, { ...opts, method: 'GET' });
}
