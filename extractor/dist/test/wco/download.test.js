import test from 'node:test';
import assert from 'node:assert/strict';
import { getSeriesDetail, getVideoInfo } from '../../src/wco/index.js';
import { cfFetch, clearCookies, getCookieJar } from '../../src/wco/curl-fetch.js';
const LIVE_DETAIL_URL = 'https://www.wcoflix.tv/anime/classroom-of-the-elite/season=all&lang=dub';
function handleNetworkError(t, err) {
    const code = err?.cause?.code ?? err?.code ?? err?.status;
    const message = err?.message ?? '';
    if (message.includes('failed: 4') || message.includes('failed: 5')) {
        const statusMatch = message.match(/(\d{3})/);
        const statusCode = statusMatch?.[1] ?? 'unknown';
        throw new Error(`WCO download test failed with HTTP ${statusCode}`);
    }
    if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code)) {
        t.skip(`WCO download test skipped (${code})`);
        return;
    }
    throw err;
}
function isWcoCdnUrl(url) {
    return url.includes('wcostream.com') && url.includes('/getvid?evid=');
}
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
async function fetchVideoChunk(url) {
    const response = await cfFetch(url, {
        headers: {
            'Range': 'bytes=0-1023',
            'Referer': 'https://embed.wcostream.com/',
            'user-agent': USER_AGENT
        }
    });
    if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to fetch video chunk: ${response.status}`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    return { response, data };
}
test('WCO download extraction returns multiple qualities with valid CDN URLs', async (t) => {
    try {
        clearCookies();
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'series should have episodes');
        const info = await getVideoInfo(detail.episodes[0].url);
        assert.ok(info.url.startsWith('http'), 'video url should be valid http');
        assert.ok(info.filename.endsWith('.mp4'), 'filename should end with .mp4');
        console.log('Video qualities available:');
        console.log('  - SD:', info.url.slice(0, 60) + '...');
        console.log('  - HD:', info.hdUrl ? info.hdUrl.slice(0, 60) + '...' : 'not available');
        console.log('  - Full HD:', info.fullHdUrl ? info.fullHdUrl.slice(0, 60) + '...' : 'not available');
        assert.ok(isWcoCdnUrl(info.url), 'SD URL should be from WCO CDN (wcostream.com with /getvid?evid=)');
        if (info.hdUrl) {
            assert.ok(isWcoCdnUrl(info.hdUrl), 'HD URL should be from WCO CDN');
            const sdEvid = new URL(info.url).searchParams.get('evid');
            const hdEvid = new URL(info.hdUrl).searchParams.get('evid');
            assert.notStrictEqual(sdEvid, hdEvid, 'SD and HD should have different evid tokens');
        }
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
test('WCO download URLs use correct CDN domain structure', async (t) => {
    try {
        clearCookies();
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'series should have episodes');
        const info = await getVideoInfo(detail.episodes[0].url);
        assert.ok(info.url.includes('wcostream.com'), 'video URL should be from wcostream.com');
        assert.ok(info.url.includes('/getvid?evid='), 'video URL should have evid parameter');
        if (info.hdUrl) {
            assert.ok(info.hdUrl.includes('wcostream.com'), 'HD URL should be from wcostream.com');
        }
        if (info.fullHdUrl) {
            assert.ok(info.fullHdUrl.includes('wcostream.com'), 'Full HD URL should be from wcostream.com');
        }
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
test('WCO download different quality URLs are different', async (t) => {
    try {
        clearCookies();
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'series should have episodes');
        const info = await getVideoInfo(detail.episodes[0].url);
        if (!info.hdUrl) {
            t.skip('HD quality not available');
            return;
        }
        assert.notStrictEqual(info.url, info.hdUrl, 'SD and HD URLs should be different');
        const sdEvid = new URL(info.url).searchParams.get('evid');
        const hdEvid = new URL(info.hdUrl).searchParams.get('evid');
        assert.notStrictEqual(sdEvid, hdEvid, 'SD and HD should have different evid tokens');
        console.log('SD evid:', sdEvid?.slice(0, 20) + '...');
        console.log('HD evid:', hdEvid?.slice(0, 20) + '...');
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
test('WCO actual video download fetches valid MP4 chunks', async (t) => {
    try {
        clearCookies();
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'series should have episodes');
        const info = await getVideoInfo(detail.episodes[0].url);
        const testUrl = info.hdUrl || info.url;
        console.log('Testing video download from:', testUrl.slice(0, 60) + '...');
        console.log('Cookies available:', getCookieJar().size > 0 ? 'Yes' : 'No');
        const { response, data } = await fetchVideoChunk(testUrl);
        console.log('Response status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        console.log('Content-Length:', response.headers.get('content-length'));
        console.log('Downloaded bytes:', data.length);
        // Should get 200 OK or 206 Partial Content
        assert.ok(response.status === 200 || response.status === 206, 'should get video data (200 or 206)');
        assert.ok(data.length > 0, 'should receive video bytes');
        // Check content type
        const contentType = response.headers.get('content-type') || '';
        assert.ok(contentType.includes('video/') ||
            contentType.includes('application/octet-stream') ||
            contentType.includes('binary'), `Expected video content type, got ${contentType}`);
        // Check for MP4 signature (ftyp box at offset 4)
        const isMp4 = data.length >= 8 &&
            data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
        // Check for MPEG transport stream
        const isTs = data[0] === 0x47;
        // Check for WebM/MKV
        const isWebm = data[0] === 0x1A && data[1] === 0x45 && data[2] === 0xDF && data[3] === 0xA3;
        console.log('MP4 signature:', isMp4);
        console.log('TS signature:', isTs);
        console.log('WebM signature:', isWebm);
        const isValidContainer = isMp4 || isTs || isWebm;
        assert.ok(isValidContainer, 'downloaded data should have valid video container signature');
        // Show hex preview of first 16 bytes
        const hexPreview = Array.from(data.slice(0, 16))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        console.log('First 16 bytes (hex):', hexPreview);
        // Show ASCII preview
        const asciiPreview = Array.from(data.slice(0, 16))
            .map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.')
            .join('');
        console.log('First 16 bytes (ASCII):', asciiPreview);
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
test('WCO multiple quality downloads return different video data', async (t) => {
    try {
        clearCookies();
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'series should have episodes');
        const info = await getVideoInfo(detail.episodes[0].url);
        if (!info.hdUrl) {
            t.skip('HD quality not available for comparison');
            return;
        }
        console.log('Fetching SD and HD chunks for comparison...');
        // Fetch both qualities
        const [sdResult, hdResult] = await Promise.all([
            fetchVideoChunk(info.url),
            fetchVideoChunk(info.hdUrl)
        ]);
        console.log('SD response:', sdResult.response.status, 'size:', sdResult.data.length);
        console.log('HD response:', hdResult.response.status, 'size:', hdResult.data.length);
        // Both should succeed
        assert.ok(sdResult.response.ok || sdResult.response.status === 206, 'SD should be reachable');
        assert.ok(hdResult.response.ok || hdResult.response.status === 206, 'HD should be reachable');
        // Both should have data
        assert.ok(sdResult.data.length > 0, 'SD should have video data');
        assert.ok(hdResult.data.length > 0, 'HD should have video data');
        // URLs should be different (different evid tokens)
        assert.notStrictEqual(info.url, info.hdUrl, 'SD and HD URLs should be different');
        // Both should have valid MP4 signatures (or other container)
        const sdIsMp4 = sdResult.data.length >= 8 &&
            sdResult.data[4] === 0x66 && sdResult.data[5] === 0x74 && sdResult.data[6] === 0x79 && sdResult.data[7] === 0x70;
        const hdIsMp4 = hdResult.data.length >= 8 &&
            hdResult.data[4] === 0x66 && hdResult.data[5] === 0x74 && hdResult.data[6] === 0x79 && hdResult.data[7] === 0x70;
        console.log('SD MP4 signature:', sdIsMp4);
        console.log('HD MP4 signature:', hdIsMp4);
        // At least one should be valid MP4 (they might use different container formats)
        assert.ok(sdIsMp4 || hdIsMp4, 'at least one quality should have valid MP4 signature');
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
