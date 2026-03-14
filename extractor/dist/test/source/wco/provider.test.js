import test from 'node:test';
import assert from 'node:assert/strict';
import { createWcoSource } from '../../../src/source/providers/wco/index.js';
const DETAIL_URL = 'https://www.wcoflix.tv/anime/futurama';
const videoInfo = {
    url: 'https://cdn.wcostream.com/getvid?evid=enc123',
    hdUrl: 'https://cdn.wcostream.com/getvid?evid=hd456',
    fullHdUrl: 'https://cdn.wcostream.com/getvid?evid=fhd789',
    filename: 'testvideo.mp4'
};
const detail = {
    title: 'Futurama',
    url: DETAIL_URL,
    thumbnail: 'https://example.com/thumb.jpg',
    description: 'Space comedy droids',
    tags: ['Comedy'],
    episodes: [
        { title: 'Episode 1', url: 'https://www.wcoflix.tv/futurama-ep-1' },
        { title: 'Episode 2', url: 'https://www.wcoflix.tv/futurama-ep-2' }
    ]
};
const client = {
    searchSeries: async () => [{ title: detail.title, url: detail.url }],
    getSeriesDetail: async () => detail,
    getVideoInfo: async () => videoInfo
};
test('WCO provider search results expose metadata', async () => {
    const provider = createWcoSource(client);
    const results = await provider.searchByName('tv', 'futurama');
    assert.strictEqual(results[0].tmdbId, DETAIL_URL);
    assert.strictEqual(results[0].metadata?.detailUrl, DETAIL_URL);
});
test('WCO provider fetchDownloads returns grouped MP4 entries', async () => {
    const provider = createWcoSource(client);
    const seasonInfo = (await provider.describeFromTmdb('tv', DETAIL_URL));
    const descriptor = {
        type: 'tv',
        tmdbId: seasonInfo.tmdbId,
        season: seasonInfo.seasonNumber,
        episode: 1,
        description: `${seasonInfo.title} S${seasonInfo.seasonNumber}E1`,
        title: seasonInfo.title,
        metadata: seasonInfo.metadata
    };
    const result = await provider.fetchDownloads(descriptor);
    assert.strictEqual(result.downloadPage, detail.episodes[0].url);
    const mp4Entries = result.downloads.MP4;
    assert.ok(mp4Entries.length >= 1);
    assert.ok(mp4Entries.some((entry) => entry.url === videoInfo.url));
    assert.strictEqual(result.friendlyName.includes('S1E1'), true);
});
