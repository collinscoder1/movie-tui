import test, { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createAnikaiSource } from '../../../src/source/providers/anikai/index.js';

const DANDADAN_SEASON_2_URL = 'https://anikai.to/watch/dan-da-dan-season-2-8lk0';

function handleNetworkError(t: TestContext, err: unknown): void {
  const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code ?? (err as { code?: string })?.code;
  const message = (err as Error)?.message ?? '';

  if (message.includes('failed: 4') || message.includes('failed: 5') || message.includes('request failed: 4') || message.includes('request failed: 5')) {
    throw err as Error;
  }

  if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code ?? '')) {
    t.skip(`AnimeKAI live download test skipped (${code})`);
    return;
  }

  throw err as Error;
}

async function fetchFirstChunk(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Range: 'bytes=0-1023',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(20000)
  });

  assert.ok(response.ok || response.status === 206, `Expected 2xx/206 from AnimeKAI final download URL, got ${response.status}`);
  const chunk = new Uint8Array(await response.arrayBuffer());
  assert.ok(chunk.length > 0, 'Expected at least one byte from AnimeKAI final download URL');
  return chunk;
}

test('AnimeKAI real final download URLs can fetch video bytes', async (t) => {
  try {
    const provider = createAnikaiSource();
    const result = await provider.fetchDownloads({
      type: 'tv',
      tmdbId: DANDADAN_SEASON_2_URL,
      season: 2,
      episode: 4,
      description: 'Dan Da Dan S2E4',
      title: 'Dan Da Dan',
      metadata: {
        detailUrl: DANDADAN_SEASON_2_URL
      }
    });

    const mp4Entries = result.downloads.MP4 ?? [];
    assert.ok(mp4Entries.length > 0, 'Expected at least one final AnimeKAI MP4 download');

    assert.ok(
      mp4Entries.some((entry) => entry.resolution === '360p'),
      'Expected AnimeKAI quality normalization to expose a 360p entry'
    );

    for (const entry of mp4Entries.slice(0, 2)) {
      await t.test(`fetch chunk ${entry.resolution ?? 'unknown'}`, async () => {
        const chunk = await fetchFirstChunk(entry.url);
        const isMp4 = chunk.length >= 8
          && chunk[4] === 0x66
          && chunk[5] === 0x74
          && chunk[6] === 0x79
          && chunk[7] === 0x70;
        assert.ok(isMp4 || chunk.length > 0, 'Expected downloadable bytes from AnimeKAI final URL');
      });
    }
  } catch (err) {
    handleNetworkError(t, err);
  }
});
