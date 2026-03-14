import { getSeriesDetail, getVideoInfo } from './dist/src/wco/index.js';
import { cfFetch, getCookieJar, clearCookies } from './dist/src/wco/curl-fetch.js';

const LIVE_DETAIL_URL = 'https://www.wcoflix.tv/anime/classroom-of-the-elite/season=all&lang=dub';

console.log('=== Testing WCO Download ===');

try {
  clearCookies();
  console.log('Cookies cleared');

  const detail = await getSeriesDetail(LIVE_DETAIL_URL);
  console.log('Got', detail.episodes.length, 'episodes');

  const info = await getVideoInfo(detail.episodes[0].url);
  console.log('\n=== Video URLs ===');
  console.log('SD:', info.url);
  console.log('HD:', info.hdUrl);

  console.log('\n=== Cookies after getVideoInfo ===');
  const cookies = getCookieJar();
  console.log('Cookie count:', cookies.size);
  for (const [domain, cookie] of cookies.entries()) {
    console.log(`  ${domain}: ${cookie.slice(0, 40)}...`);
  }

  // Try downloading with debug
  const testUrl = info.hdUrl || info.url;
  console.log('\n=== Fetching from:', testUrl.slice(0, 60) + '...');

  const response = await cfFetch(testUrl, {
    headers: {
      'Range': 'bytes=0-1023',
      'Referer': 'https://embed.wcostream.com/'
    }
  });

  console.log('Response status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));

  const data = await response.arrayBuffer();
  console.log('Data length:', data.byteLength);

} catch (err) {
  console.error('Error:', err.message);
}
