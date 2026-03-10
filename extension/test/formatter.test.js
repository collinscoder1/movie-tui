import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLogsForClipboard } from '../logger-utils.js';

const sampleHeaders = [
  { name: 'sec-ch-ua', value: '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"' },
  { name: 'sec-ch-ua-mobile', value: '?0' },
  { name: 'sec-ch-ua-platform', value: '"Linux"' },
  { name: 'Upgrade-Insecure-Requests', value: '1' },
  { name: 'User-Agent', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' },
  { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' },
  { name: 'Sec-GPC', value: '1' },
  { name: 'Sec-Fetch-Site', value: 'cross-site' },
  { name: 'Sec-Fetch-Mode', value: 'navigate' },
  { name: 'Sec-Fetch-User', value: '?1' },
  { name: 'Sec-Fetch-Dest', value: 'document' }
];

test('clipboard formatter produces full metadata dump', () => {
  const logs = [
    {
      timestamp: 1,
      stage: 'changed',
      url: 'https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw',
      finalUrl: 'https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw',
      mime: 'video/x-matroska',
      fileType: 'video/x-matroska',
      state: 'interrupted',
      totalBytes: 48.7 * 1024 * 1024,
      bytesReceived: undefined,
      delta: { state: 'interrupted', bytesReceived: undefined, exists: true },
      referer: 'https://dl.vidsrc.vip',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      cookieHeader: 'session=abc123',
      requestHeaders: sampleHeaders
    },
    {
      timestamp: 2,
      stage: 'created',
      url: 'https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw',
      finalUrl: 'https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw',
      mime: 'video/x-matroska',
      fileType: 'video/x-matroska',
      state: 'in_progress',
      totalBytes: 48.7 * 1024 * 1024,
      bytesReceived: undefined,
      delta: { exists: false },
      referer: 'https://dl.vidsrc.vip',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      cookieHeader: 'session=abc123',
      requestHeaders: sampleHeaders
    }
  ];

  const formatTimestamp = (timestamp) =>
    timestamp === 1 ? '12:05:05 AM' : '12:05:03 AM';
  const output = formatLogsForClipboard(logs, formatTimestamp);

  const expected = `Captured 2 download events

12:05:05 AM · changed https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw
mime: video/x-matroska
type: video/x-matroska
state: interrupted
total: 48.7 MB
received: unknown size
Δ bytes=unknown size · state=interrupted
referer: https://dl.vidsrc.vip
user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
cookies: session=abc123
request headers (11)
sec-ch-ua: "Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Linux"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8
Sec-GPC: 1
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document

12:05:03 AM · created https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw https://mkv.t4c1quyuy2.workers.dev/d/WCnjI21G_hgTnTm2oGVtEbxvSK3-34UnJ_mCAtgiGUw
mime: video/x-matroska
type: video/x-matroska
state: in_progress
total: 48.7 MB
received: unknown size
referer: https://dl.vidsrc.vip
user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
cookies: session=abc123
request headers (11)
sec-ch-ua: "Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Linux"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8
Sec-GPC: 1
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document`;

  assert.strictEqual(output, expected);
});
