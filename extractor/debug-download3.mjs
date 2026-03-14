import { spawn } from 'child_process';

async function curlFetch(url, headers = {}, cookie = null) {
  return new Promise((resolve, reject) => {
    const args = ['--http2', '--silent', '--include', '--max-time', '30'];
    Object.entries(headers).forEach(([k, v]) => args.push('-H', `${k}: ${v}`));
    if (cookie) args.push('-b', cookie);
    args.push(url);

    const curl = spawn('curl', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    curl.stdout.on('data', (chunk) => chunks.push(chunk));
    curl.on('close', (code) => {
      if (code !== 0) return reject(new Error(`curl failed: ${code}`));
      const output = Buffer.concat(chunks).toString('utf-8');
      const headerEnd = output.indexOf('\r\n\r\n');
      const headers = output.slice(0, headerEnd);
      const body = output.slice(headerEnd + 4);
      resolve({ headers, body, status: parseInt(headers.match(/HTTP\/\d(?:\.\d)?\s+(\d+)/)?.[1] || '0', 10) });
    });
  });
}

const { getSeriesDetail, getVideoInfo } = await import('./dist/src/wco/index.js');
const { getCookieJar, clearCookies } = await import('./dist/src/wco/curl-fetch.js');

const LIVE_DETAIL_URL = 'https://www.wcoflix.tv/anime/classroom-of-the-elite/season=all&lang=dub';

console.log('=== Testing immediate download ===');

clearCookies();
const detail = await getSeriesDetail(LIVE_DETAIL_URL);
console.log('Got', detail.episodes.length, 'episodes');

const info = await getVideoInfo(detail.episodes[0].url);
console.log('HD URL:', info.hdUrl);

const cookies = getCookieJar();
const cookieStr = [...cookies.values()].join('; ');
console.log('Cookie:', cookieStr.slice(0, 50) + '...');

// Try download immediately
console.log('\n=== Fetching video ===');
const result = await curlFetch(info.hdUrl, {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Range': 'bytes=0-1023',
  'Referer': 'https://embed.wcostream.com/',
  'Sec-Fetch-Dest': 'video',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'same-site',
  'Sec-GPC': '1',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
}, cookieStr);

console.log('Status:', result.status);
console.log('Headers:', result.headers.split('\r\n').slice(0, 10).join('\n'));
console.log('Body preview:', result.body.slice(0, 200));
