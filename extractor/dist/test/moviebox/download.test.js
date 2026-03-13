import test from 'node:test';
import assert from 'node:assert/strict';
import { getDownloadLinks, getSubjectDetail } from '../../src/moviebox/index.js';
const DETAIL_PATHS = [
    'the-chi-0OZDg6KP353',
    'the-box-GD9RExkp9Q8',
    'stranger-things-wsymkZvcaU5'
];
async function fetchFirstChunk(url) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Range: 'bytes=0-1023',
            Referer: 'https://downloader2.com/',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(15000)
    });
    console.log(`    chunk fetch status ${response.status} (${response.statusText ?? 'unknown'})`);
    console.log(`    headers: content-type=${response.headers.get('content-type') ?? 'unknown'}, content-length=${response.headers.get('content-length') ?? 'unknown'}`);
    assert.ok(response.ok, `Expected 2xx from download URL, got ${response.status}`);
    const chunk = await response.arrayBuffer();
    assert.ok(chunk.byteLength > 0, 'Should receive at least one byte');
    console.log(`    chunk length: ${chunk.byteLength} bytes`);
    const view = new Uint8Array(chunk);
    if (view.length >= 8) {
        const isMp4 = view[4] === 0x66 && view[5] === 0x74 && view[6] === 0x79 && view[7] === 0x70;
        const isMkv = view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3;
        if (isMp4)
            console.log('    container detected: MP4');
        if (isMkv)
            console.log('    container detected: MKV/WebM');
    }
}
test('moviebox download endpoint can fetch a few bytes', async (t) => {
    for (const detailPath of DETAIL_PATHS) {
        await t.test(`detail ${detailPath}`, async (st) => {
            try {
                const detail = await getSubjectDetail(detailPath);
                console.log(`detail fetched: subjectId=${detail.subjectId}, title=${detail.title}, type=${detail.type}, hasResource=${detail.hasResource}`);
                assert.ok(detail.hasResource, 'moviebox detail should report at least one downloadable resource');
                const isTvLike = detail.type === 'tv' || detail.type === 'anime';
                const availableSeasons = detail.seasons.map((season) => season.seasonNumber);
                if (isTvLike) {
                    assert.ok(availableSeasons.length > 0, 'TV detail should report at least one season');
                }
                console.log(`  available seasons: ${availableSeasons.join(', ') || 'none'}`);
                assert.ok(detail.seasons.length > 0, 'Detail should expose at least one season entry');
                const seasonCandidate = (isTvLike
                    ? detail.seasons.find((season) => season.episodes.length > 0)
                    : detail.seasons[0]) ?? detail.seasons[0];
                assert.ok(seasonCandidate, 'Unable to determine a season for download');
                assert.ok(seasonCandidate.episodes.length > 0, `Season ${seasonCandidate.seasonNumber} should include at least one episode`);
                const seasonNumber = seasonCandidate.seasonNumber;
                // Movies use episode 0, TV shows use the first episode
                const episodeNumber = isTvLike ? seasonCandidate.episodes[0].episode : 0;
                console.log(`  using season ${seasonNumber}, episode ${episodeNumber}`);
                const downloadResult = await getDownloadLinks(detail.subjectId, seasonNumber, episodeNumber, detailPath);
                assert.ok(downloadResult.hasResource && downloadResult.downloads.length > 0, 'moviebox download endpoint should return at least one stream');
                console.log(`  downloads returned: ${downloadResult.downloads.length}`);
                downloadResult.downloads.slice(0, 3).forEach((entry, index) => {
                    console.log(`    ${index + 1}. ${entry.format} ${entry.resolution ?? 'any'} / size=${entry.size ?? 'unknown'} / ${entry.url.substring(0, 60)}...`);
                });
                if (downloadResult.subtitles.length > 0) {
                    console.log(`  subtitles returned: ${downloadResult.subtitles.length}`);
                    downloadResult.subtitles.slice(0, 3).forEach((sub, idx) => {
                        console.log(`    ${idx + 1}. ${sub.lanName} (${sub.size ?? 'unknown'}) -> ${sub.url}`);
                    });
                }
                const entries = downloadResult.downloads.slice(0, 2);
                for (const entry of entries) {
                    await st.test(`chunk download ${entry.format} ${entry.resolution || 'any'}`, async () => {
                        console.log(`    Testing ${entry.format} ${entry.resolution || 'any'} (${entry.url.substring(0, 60)}...)`);
                        try {
                            await fetchFirstChunk(entry.url);
                        }
                        catch (err) {
                            console.error(`    Moviebox download failed for ${entry.format} ${entry.resolution}:`, err);
                            throw err;
                        }
                    });
                }
                if (downloadResult.subtitles.length > 0) {
                    for (const subtitle of downloadResult.subtitles.slice(0, 2)) {
                        await st.test(`subtitle HEAD ${subtitle.lanName}`, async () => {
                            console.log(`    HEAD ${subtitle.lanName} -> ${subtitle.url}`);
                            const response = await fetch(subtitle.url, {
                                method: 'HEAD',
                                signal: AbortSignal.timeout(10000)
                            });
                            console.log(`      status ${response.status}`);
                            assert.ok(response.ok, `Subtitle HEAD should succeed for ${subtitle.lanName}`);
                        });
                    }
                }
            }
            catch (err) {
                console.error('Moviebox download test setup failed', err);
                const causeCode = err?.cause?.code ?? err?.code;
                if (causeCode === 'EAI_AGAIN' || causeCode === 'ENOTFOUND' || causeCode === 'ECONNREFUSED') {
                    st.skip(`moviebox API unreachable (${causeCode})`);
                    return;
                }
                throw err;
            }
        });
    }
});
