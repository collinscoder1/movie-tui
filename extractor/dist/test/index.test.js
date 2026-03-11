import test from 'node:test';
import assert from 'node:assert/strict';
import { extractVidsrcLinks, helpers } from '../src/extractor.js';
test('parse a tv vidSrc URL', () => {
    console.log('Parsing example tv URL');
    const parsed = helpers.parseVidsrcUrl('https://dl.vidsrc.vip/tv/tt0460637/1/8');
    assert.deepStrictEqual(parsed, { type: 'tv', id: 'tt0460637', idType: 'imdb', season: 1, episode: 8 });
});
test('formatSize converts bytes', () => {
    console.log('Formatting 1024 bytes into human readable text');
    assert.strictEqual(helpers.formatSize(1024), '1.00 KB');
    assert.strictEqual(helpers.formatSize(0), '0 B');
});
test('example URLs produce grouped downloads and subtitles', async () => {
    console.log('Setting up mocked fetch for sample URLs');
    const createMockResponse = (payload) => new Response(JSON.stringify(payload), {
        headers: { 'content-type': 'application/json' }
    });
    const fetchImpl = async (input) => {
        const resource = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : 'url' in input
                    ? input.url
                    : String(input);
        if (resource.includes('/find/')) {
            if (resource.includes('tt1757678')) {
                return createMockResponse({ movie_results: [{ id: 456 }] });
            }
            return createMockResponse({ tv_results: [{ id: 123 }] });
        }
        if (resource.includes('/movie/')) {
            return createMockResponse({ title: 'Mock Movie', release_date: '2022-02-02' });
        }
        if (resource.includes('/tv/') && !resource.includes('/season/')) {
            return createMockResponse({ name: 'Mock Series', first_air_date: '2019-05-05' });
        }
        if (resource.includes('/season/') && resource.includes('/episode/')) {
            return createMockResponse({ name: 'Mock Episode', air_date: '2019-05-05' });
        }
        throw new Error('Unexpected fetch call: ' + resource);
    };
    const fakeSupabase = {
        functions: {
            async invoke(name) {
                if (name === 'get-token') {
                    console.log('Mocked get-token invoked');
                    return { data: { t: 'token' }, error: null };
                }
                if (name === 'download-proxy') {
                    console.log('Mocked download-proxy invoked');
                    return {
                        data: {
                            extractData: {
                                data: {
                                    streams: [
                                        { size: 1024, url: 'http://media/1.mp4', resolutions: '1080p' },
                                        { size: 512, url: 'http://media/2.mp4', resolution: 720 },
                                        { size: 256, url: 'http://media/3.mp4', resolutions: 480 }
                                    ],
                                    captions: [
                                        { lanName: 'English', size: 64, url: 'http://subs/eng.vtt' }
                                    ]
                                }
                            },
                            mkvData: { files: [{ size: 5120, url: 'http://media/video.mkv' }] }
                        },
                        error: null
                    };
                }
                throw new Error('Unknown function ' + name);
            }
        }
    };
    const urls = [
        { url: 'https://dl.vidsrc.vip/movie/tt1757678', expectedType: 'movie', expectedTitle: 'Mock Movie' },
        { url: 'https://dl.vidsrc.vip/tv/tt2442560/3/2', expectedType: 'tv', expectedTitle: 'Mock Series' },
        { url: 'https://dl.vidsrc.vip/tv/tt0460637/1/8', expectedType: 'tv', expectedTitle: 'Mock Series' }
    ];
    for (const entry of urls) {
        console.log('Testing extraction for', entry.url);
        const result = await extractVidsrcLinks(entry.url, {
            fetchImpl,
            supabaseClient: fakeSupabase
        });
        console.log('Result type', result.type, 'TMDb', result.tmdbId);
        assert.strictEqual(result.type, entry.expectedType);
        assert.strictEqual(result.metadata.title, entry.expectedTitle);
        assert.ok(Object.keys(result.downloads).length > 0, 'Downloads should have at least one format');
        console.log('Downloads buckets available:', Object.keys(result.downloads).join(', '));
        // Verify all resolutions are strings (not numbers)
        const allDownloads = Object.values(result.downloads).flat();
        for (const download of allDownloads) {
            if (download.resolution !== null) {
                assert.strictEqual(typeof download.resolution, 'string', `Resolution should be string, got ${typeof download.resolution}`);
            }
        }
        console.log('All resolutions are properly typed as strings');
        // Verify we have different resolutions
        const resolutions = allDownloads.map(d => d.resolution).filter(Boolean);
        assert.ok(resolutions.length > 0, 'Should have at least one resolution');
        console.log('Available resolutions:', resolutions.join(', '));
        assert.strictEqual(result.subtitles.length, 1);
    }
});
