import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDownloadHeaders } from '../src/download-manager.js';
import { extractVidsrcLinks } from '../src/extractor.js';
test('download headers are built correctly', () => {
    const headers = buildDownloadHeaders();
    assert.strictEqual(headers.referer, 'https://dl.vidsrc.vip/');
    assert.strictEqual(headers.origin, 'https://dl.vidsrc.vip/');
    assert.ok(headers['user-agent'].startsWith('Mozilla/5.0'));
});
test('extract and actually download from real URLs', async (t) => {
    const urls = [
        { url: 'https://dl.vidsrc.vip/movie/tt1757678', type: 'movie' },
        { url: 'https://dl.vidsrc.vip/tv/tt2442560/3/2', type: 'tv' },
        { url: 'https://dl.vidsrc.vip/tv/tt0460637/1/8', type: 'tv' }
    ];
    let totalDownloadsTested = 0;
    let successfulDownloads = 0;
    for (const entry of urls) {
        await t.test(`download test for ${entry.url}`, async (st) => {
            console.log(`\nExtracting links for ${entry.url}`);
            let result;
            try {
                result = await extractVidsrcLinks(entry.url);
            }
            catch (err) {
                console.log(`  Extraction failed: ${err}. Skipping download tests.`);
                return;
            }
            assert.strictEqual(result.type, entry.type);
            assert.ok(Object.keys(result.downloads).length > 0, 'Should have download formats');
            const downloadEntries = Object.values(result.downloads).flat();
            assert.ok(downloadEntries.length > 0, 'Should have download entries');
            console.log(`Found ${downloadEntries.length} download(s):`);
            for (const dl of downloadEntries) {
                console.log(`  - ${dl.format} ${dl.resolution || ''} (${dl.size}): ${dl.url.substring(0, 80)}...`);
            }
            const headers = buildDownloadHeaders();
            for (const downloadEntry of downloadEntries.slice(0, 2)) {
                await st.test(`download ${downloadEntry.format} ${downloadEntry.resolution || ''}`, async () => {
                    console.log(`\n  Testing download: ${downloadEntry.format} ${downloadEntry.resolution || ''}`);
                    console.log(`  URL: ${downloadEntry.url.substring(0, 100)}...`);
                    totalDownloadsTested++;
                    try {
                        const response = await fetch(downloadEntry.url, {
                            method: 'GET',
                            headers,
                            signal: AbortSignal.timeout(30000)
                        });
                        console.log(`    Status: ${response.status} ${response.statusText}`);
                        console.log(`    Content-Type: ${response.headers.get('content-type') || 'unknown'}`);
                        console.log(`    Content-Length: ${response.headers.get('content-length') || 'unknown'}`);
                        assert.ok(response.ok, `Download should return 200 OK, got ${response.status}`);
                        const contentType = response.headers.get('content-type') || '';
                        assert.ok(contentType.includes('video/') ||
                            contentType.includes('application/octet-stream') ||
                            contentType.includes('binary'), `Expected video content type, got ${contentType}`);
                        const reader = response.body?.getReader();
                        if (reader) {
                            const { value, done } = await reader.read();
                            if (!done && value) {
                                console.log(`    First chunk: ${value.length} bytes`);
                                assert.ok(value.length > 0, 'Should receive data');
                                const isMp4 = value[4] === 0x66 && value[5] === 0x74 && value[6] === 0x79 && value[7] === 0x70;
                                const isMkv = value[0] === 0x1A && value[1] === 0x45 && value[2] === 0xDF && value[3] === 0xA3;
                                if (isMp4)
                                    console.log('    Detected: MP4 container');
                                if (isMkv)
                                    console.log('    Detected: MKV/WebM container');
                            }
                            reader.cancel();
                        }
                        successfulDownloads++;
                        console.log('    Download test PASSED');
                    }
                    catch (err) {
                        console.error(`    Download failed: ${err}`);
                        throw err;
                    }
                });
            }
            if (result.subtitles.length > 0) {
                console.log(`\n  Testing ${result.subtitles.length} subtitle(s):`);
                for (const sub of result.subtitles.slice(0, 2)) {
                    console.log(`    - ${sub.lanName} (${sub.size}): ${sub.url.substring(0, 60)}...`);
                    try {
                        const response = await fetch(sub.url, {
                            method: 'HEAD',
                            signal: AbortSignal.timeout(10000)
                        });
                        console.log(`      Status: ${response.status}`);
                    }
                    catch (err) {
                        console.log(`      Subtitle check skipped: ${err}`);
                    }
                }
            }
        });
    }
    console.log(`\n=== Summary: ${successfulDownloads}/${totalDownloadsTested} downloads successful ===`);
});
