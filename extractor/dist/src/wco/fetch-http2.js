import http2 from 'http2';
import { URL } from 'url';
export async function fetchHttp2(url, init) {
    const urlObj = new URL(url);
    const isHttp2 = urlObj.protocol === 'https:';
    if (!isHttp2) {
        throw new Error('HTTP/2 fetch only supports HTTPS URLs');
    }
    return new Promise((resolve, reject) => {
        const client = http2.connect(urlObj.origin, {
            rejectUnauthorized: true
        });
        const headers = {
            ':method': init?.method || 'GET',
            ':path': urlObj.pathname + urlObj.search,
            ':scheme': 'https',
            ':authority': urlObj.hostname,
            ...(init?.headers || {})
        };
        const req = client.request(headers);
        let statusCode = 0;
        let statusText = '';
        const responseHeaders = new Map();
        req.on('response', (h) => {
            statusCode = h[':status'] || 0;
            statusText = statusCode >= 200 && statusCode < 300 ? 'OK' : 'Error';
            Object.entries(h).forEach(([key, value]) => {
                if (key.startsWith(':'))
                    return;
                if (typeof value === 'string') {
                    responseHeaders.set(key, value);
                }
            });
        });
        const chunks = [];
        req.on('data', (chunk) => {
            chunks.push(chunk);
        });
        req.on('end', () => {
            client.close();
            const body = Buffer.concat(chunks);
            const response = {
                ok: statusCode >= 200 && statusCode < 300,
                status: statusCode,
                statusText,
                headers: responseHeaders,
                text: async () => body.toString('utf-8'),
                json: async () => JSON.parse(body.toString('utf-8'))
            };
            resolve(response);
        });
        req.on('error', (err) => {
            client.close();
            reject(err);
        });
        if (init?.body) {
            if (init.body instanceof FormData) {
                // Convert FormData to buffer
                const formData = init.body;
                const entries = [];
                formData.forEach((value, key) => {
                    entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                });
                req.end(entries.join('&'));
            }
            else {
                req.end(init.body);
            }
        }
        else {
            req.end();
        }
    });
}
// Wrapper that tries HTTP/2 first, falls back to regular fetch
export async function fetchWithHttp2(url, init) {
    try {
        return await fetchHttp2(url, init);
    }
    catch {
        // Fall back to standard fetch
        return fetch(url, init);
    }
}
