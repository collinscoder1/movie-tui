import test from 'node:test';
import assert from 'node:assert/strict';
import { getSeriesDetail, getVideoInfo } from '../../src/wco/index.js';
const LIVE_DETAIL_URL = 'https://www.wcoflix.tv/anime/classroom-of-the-elite/season=all&lang=dub';
function handleNetworkError(t, err) {
    const code = err?.cause?.code ?? err?.code ?? err?.status;
    const message = err?.message ?? '';
    // Fail on 4xx and 5xx HTTP errors - these indicate Cloudflare blocks or other issues
    if (message.includes('failed: 4') || message.includes('failed: 5')) {
        const statusMatch = message.match(/(\d{3})/);
        const statusCode = statusMatch?.[1] ?? 'unknown';
        throw new Error(`WCO request failed with HTTP ${statusCode}. This may indicate Cloudflare blocking.`);
    }
    // Skip on network connectivity errors only
    if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code)) {
        t.skip(`WCO live test skipped (${code})`);
        return;
    }
    throw err;
}
test('live WCO classroom detail returns episodes', async (t) => {
    try {
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'expected at least one episode');
        assert.ok(detail.episodes[0].url.startsWith('http'), 'episode url should be absolute');
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
test('live WCO classroom episode yields video info', async (t) => {
    try {
        const detail = await getSeriesDetail(LIVE_DETAIL_URL);
        assert.ok(detail.episodes.length > 0, 'detail should expose episodes before video fetch');
        const info = await getVideoInfo(detail.episodes[0].url);
        assert.ok(info.url.startsWith('http'), 'video url should be valid http');
        assert.ok(info.filename.endsWith('.mp4'), 'filename should end with .mp4');
    }
    catch (err) {
        handleNetworkError(t, err);
    }
});
