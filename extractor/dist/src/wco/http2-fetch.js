import http2 from 'http2';
import { URL } from 'url';
function nodeHeadersToWeb(headers) {
    const webHeaders = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
        if (key.startsWith(':'))
            return;
        if (typeof value === 'string') {
            webHeaders.set(key, value);
        }
        else if (Array.isArray(value)) {
            value.forEach(v => webHeaders.append(key, v));
        }
    });
    return webHeaders;
}
export function isWcoflixUrl(url) {
    return url.includes('wcoflix.tv') || url.includes('wcostream.com');
}
export async function fetchHttp2(url, init) {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
        throw new Error('HTTP/2 fetch only supports HTTPS URLs');
    }
    return new Promise((resolve, reject) => {
        const client = http2.connect(urlObj.origin, {
            rejectUnauthorized: true
        });
        client.on('error', (err) => {
            reject(err);
        });
        const reqHeaders = {
            ':method': init?.method || 'GET',
            ':path': urlObj.pathname + urlObj.search,
            ':scheme': 'https',
            ':authority': urlObj.hostname,
        };
        // Add custom headers
        const initHeaders = init?.headers;
        if (initHeaders) {
            Object.entries(initHeaders).forEach(([key, value]) => {
                // Skip pseudo-headers
                if (key.startsWith(':'))
                    return;
                // HTTP/2 requires lowercase header names
                reqHeaders[key.toLowerCase()] = value;
            });
        }
        const req = client.request(reqHeaders);
        let statusCode = 0;
        const responseHeaders = {};
        req.on('response', (headers) => {
            statusCode = headers[':status'] || 0;
            Object.entries(headers).forEach(([key, value]) => {
                if (key.startsWith(':'))
                    return;
                responseHeaders[key] = value;
            });
        });
        const chunks = [];
        req.on('data', (chunk) => {
            chunks.push(chunk);
        });
        req.on('end', () => {
            client.close();
            const body = Buffer.concat(chunks);
            const ok = statusCode >= 200 && statusCode < 300;
            const response = {
                ok,
                status: statusCode,
                statusText: ok ? 'OK' : 'Error',
                headers: nodeHeadersToWeb(responseHeaders),
                text: async () => body.toString('utf-8'),
                json: async () => JSON.parse(body.toString('utf-8'))
            };
            resolve(response);
        });
        req.on('error', (err) => {
            client.close();
            reject(err);
        });
        // Handle body
        if (init?.body) {
            if (init.body instanceof FormData) {
                const formData = init.body;
                const entries = [];
                formData.forEach((value, key) => {
                    entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                });
                req.end(entries.join('&'));
            }
            else {
                // For string or other types
                req.end(String(init.body));
            }
        }
        else {
            req.end();
        }
    });
}
// Smart fetch that uses HTTP/2 for Cloudflare-protected domains
export async function smartFetch(url, init) {
    if (isWcoflixUrl(url)) {
        try {
            return await fetchHttp2(url, init);
        }
        catch (err) {
            // Fall back to regular fetch if HTTP/2 fails
            console.warn('HTTP/2 fetch failed, falling back to regular fetch:', err);
        }
    }
    return fetch(url, init);
}
