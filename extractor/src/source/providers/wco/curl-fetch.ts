import { spawn } from 'child_process';

// Store cookies per domain
const cookieJar = new Map<string, string>();

class CurlResponse {
  private _bodyBuffer: Buffer;
  private _bodyText: string | null = null;
  private _status: number;
  private _statusText: string;
  private _headers: Headers;
  private _cookies: string[] = [];

  constructor(body: Buffer, status: number, statusText: string, headers: Headers, cookies: string[] = []) {
    this._bodyBuffer = body;
    this._status = status;
    this._statusText = statusText;
    this._headers = headers;
    this._cookies = cookies;
  }

  get ok(): boolean {
    return this._status >= 200 && this._status < 300;
  }

  get status(): number {
    return this._status;
  }

  get statusText(): string {
    return this._statusText;
  }

  get headers(): Headers {
    return this._headers;
  }

  get cookies(): string[] {
    return this._cookies;
  }

  get body(): ReadableStream<Uint8Array> | null {
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(new Uint8Array(this._bodyBuffer));
        controller.close();
      }
    });
  }

  get bodyUsed(): boolean {
    return false;
  }

  get redirected(): boolean {
    return false;
  }

  get type(): ResponseType {
    return 'basic';
  }

  get url(): string {
    return '';
  }

  async text(): Promise<string> {
    if (this._bodyText === null) {
      this._bodyText = this._bodyBuffer.toString('utf-8');
    }
    return this._bodyText;
  }

  async json(): Promise<unknown> {
    const text = await this.text();
    return JSON.parse(text);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._bodyBuffer.buffer.slice(
      this._bodyBuffer.byteOffset,
      this._bodyBuffer.byteOffset + this._bodyBuffer.byteLength
    ) as ArrayBuffer;
  }

  async blob(): Promise<Blob> {
    return new Blob([new Uint8Array(this._bodyBuffer)]);
  }

  async formData(): Promise<FormData> {
    throw new Error('formData not supported in curl response');
  }

  clone(): CurlResponse {
    const clonedBuffer = Buffer.from(this._bodyBuffer);
    return new CurlResponse(clonedBuffer, this._status, this._statusText, this._headers, this._cookies);
  }
}

function curlEscape(str: string): string {
  return str.replace(/"/g, '\\"');
}

// Extract domain from URL for cookie storage
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Get stored cookies for a domain (handles subdomains)
function getCookiesForDomain(domain: string): string {
  const cookies: string[] = [];
  const baseDomain = getBaseDomain(domain);

  for (const [cookieDomain, cookieValue] of cookieJar.entries()) {
    // Match by base domain (e.g., wcostream.com matches embed.wcostream.com, cdn.wcostream.com)
    if (baseDomain === cookieDomain || cookieDomain.endsWith(baseDomain)) {
      cookies.push(cookieValue);
    }
  }
  return cookies.join('; ');
}

// Get base domain for cookie storage (e.g., wcostream.com from embed.wcostream.com)
function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    // Return last 2 parts for TLD + domain (e.g., wcostream.com)
    return parts.slice(-2).join('.');
  }
  return hostname;
}

// Parse Set-Cookie headers
function parseCookies(headerValue: string): string | null {
  // Extract cookie name=value (before any ;)
  const match = headerValue.match(/^([^;]+)/);
  return match ? match[1] : null;
}

async function curlFetchInternal(url: string, init?: RequestInit): Promise<CurlResponse> {
  const domain = getDomain(url);
  const storedCookies = getCookiesForDomain(domain);

  const args: string[] = [
    '--http2',
    '--silent',
    '--include',
    '--max-time', '30',
    '--location' // Follow redirects
  ];

  // Add headers from init
  const headers: Record<string, string> = {};
  const initHeaders = init?.headers as Record<string, string>;
  if (initHeaders) {
    Object.entries(initHeaders).forEach(([key, value]) => {
      headers[key.toLowerCase()] = value;
    });
  }

  // Add stored cookies if available and no Cookie header provided
  if (storedCookies && !headers['cookie']) {
    headers['cookie'] = storedCookies;
  }

  // Add all headers to curl args
  Object.entries(headers).forEach(([key, value]) => {
    args.push('-H', `${key}: ${curlEscape(value)}`);
  });

  // Handle method
  if (init?.method && init.method !== 'GET') {
    args.push('-X', init.method);
  }

  // Handle body - FormData
  if (init?.body) {
    if (init.body instanceof FormData) {
      const formData = init.body as FormData;
      formData.forEach((value, key) => {
        args.push('-F', `${key}=${value}`);
      });
    } else {
      args.push('--data', String(init.body));
    }
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    const curl = spawn('curl', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const chunks: Buffer[] = [];
    let stderr = '';

    curl.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });

    curl.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    curl.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl failed with code ${code}: ${stderr}`));
        return;
      }

      const output = Buffer.concat(chunks);
      const outputStr = output.toString('binary');

      // Find the last HTTP response (after all redirects)
      const headerMatches = [...outputStr.matchAll(/HTTP\/\d(?:\.\d)?\s+\d+/g)];

      let finalHeadersStart = 0;
      let finalBodyStart = output.length;

      if (headerMatches.length > 0) {
        const lastMatch = headerMatches[headerMatches.length - 1];
        finalHeadersStart = lastMatch.index || 0;

        const afterLastHttp = outputStr.slice(finalHeadersStart);
        const headerEndMatch = afterLastHttp.search(/\r\n\r\n/);

        if (headerEndMatch !== -1) {
          finalBodyStart = finalHeadersStart + headerEndMatch + 4;
        }
      }

      const headerSection = outputStr.slice(finalHeadersStart, finalBodyStart);
      const bodyBuffer = output.slice(finalBodyStart);

      // Parse status line
      const lines = headerSection.split('\r\n');
      const statusLine = lines[0];
      const statusMatch = statusLine.match(/HTTP\/\d(?:\.\d)?\s+(\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      // Parse headers and cookies
      const responseHeaders = new Headers();
      const cookies: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex).trim().toLowerCase();
          const value = line.slice(colonIndex + 1).trim();
          responseHeaders.set(key, value);

          // Extract Set-Cookie headers
          if (key === 'set-cookie') {
            const cookie = parseCookies(value);
            if (cookie) {
              cookies.push(cookie);
              // Store in cookie jar using base domain (e.g., wcostream.com)
              const cookieName = cookie.split('=')[0];
              if (cookieName === 'PHPSESSID') {
                const baseDomain = getBaseDomain(domain);
                cookieJar.set(baseDomain, cookie);
              }
            }
          }
        }
      }

      const statusText = status >= 200 && status < 300 ? 'OK' : 'Error';

      resolve(new CurlResponse(bodyBuffer, status, statusText, responseHeaders, cookies));
    });

    curl.on('error', (err) => {
      reject(err);
    });
  });
}

// Check if curl is available
async function isCurlAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const curl = spawn('curl', ['--version']);
    curl.on('error', () => resolve(false));
    curl.on('close', (code) => resolve(code === 0));
  });
}

// Check if URL should use curl (WCO-related domains)
function shouldUseCurl(url: string): boolean {
  return url.includes('wcoflix.tv') ||
         url.includes('wcostream.com') ||
         url.includes('/getvid?evid='); // WCO CDN video URLs
}

// Wrapper that uses curl for Cloudflare sites
export async function cfFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = input.toString();
  const useCurl = await isCurlAvailable();
  if (useCurl && shouldUseCurl(url)) {
    const curlResponse = await curlFetchInternal(url, init);
    return curlResponse as unknown as Response;
  }
  return fetch(input, init);
}

// Export cookie jar for testing/debugging
export function getCookieJar(): ReadonlyMap<string, string> {
  return cookieJar;
}

// Clear cookies (useful for testing)
export function clearCookies(): void {
  cookieJar.clear();
}
