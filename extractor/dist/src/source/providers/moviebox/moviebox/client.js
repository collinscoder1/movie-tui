const BASE_URL = 'https://h5-api.aoneroom.com';
function buildHeaders(locale) {
    return {
        "accept": "application/json",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "origin": "https://downloader2.com",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "referer": "https://downloader2.com/",
        "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Brave\";v=\"145\", \"Chromium\";v=\"145\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        "x-client-info": "{\"timezone\":\"Africa/Nairobi\"}",
        "x-request-lang": locale
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
