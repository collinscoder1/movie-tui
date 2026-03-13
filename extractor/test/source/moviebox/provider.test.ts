import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { parseSearchResponse, parseDetailResponse, parseDownloadResponse } from '../../../src/moviebox/index.js';
import { createMovieboxSource } from '../../../src/source/providers/moviebox/index.js';
import type { EpisodeDescriptor } from '../../../src/search.js';

async function loadFixtures() {
  const base = path.join('test', 'moviebox', 'fixtures');
  const searchPayload = JSON.parse(await readFile(path.join(base, 'search-response.json'), 'utf-8'));
  const detailPayload = JSON.parse(await readFile(path.join(base, 'detail-response.json'), 'utf-8'));
  const downloadPayload = JSON.parse(await readFile(path.join(base, 'download-response.json'), 'utf-8'));
  return {
    search: parseSearchResponse(searchPayload),
    detail: parseDetailResponse(detailPayload),
    downloads: parseDownloadResponse(downloadPayload)
  };
}

test('moviebox provider search normalizes detail path identifiers', async () => {
  const fixtures = await loadFixtures();
  const provider = createMovieboxSource({
    searchSubjects: async () => fixtures.search,
    getSubjectDetail: async () => fixtures.detail,
    getDownloadLinks: async () => fixtures.downloads
  });

  const results = await provider.searchByName('tv', 'grown');
  assert.ok(results.length > 0);
  assert.strictEqual(results[0].tmdbId, fixtures.detail.detailPath);
  assert.strictEqual(results[0].metadata?.subjectId, fixtures.search.items[0].subjectId);
});

test('moviebox provider describeFromTmdb returns tv metadata', async () => {
  const fixtures = await loadFixtures();
  const provider = createMovieboxSource({
    searchSubjects: async () => fixtures.search,
    getSubjectDetail: async () => fixtures.detail,
    getDownloadLinks: async () => fixtures.downloads
  });

  const info = await provider.describeFromTmdb('tv', fixtures.detail.detailPath);
  assert.strictEqual(info.type, 'tv');
  assert.strictEqual(info.title, fixtures.detail.title);
  assert.strictEqual(info.metadata?.detailPath, fixtures.detail.detailPath);
});

test('moviebox provider fetchDownloads returns grouped entries and subtitles', async () => {
  const fixtures = await loadFixtures();
  const provider = createMovieboxSource({
    searchSubjects: async () => fixtures.search,
    getSubjectDetail: async () => fixtures.detail,
    getDownloadLinks: async () => fixtures.downloads
  });

  const descriptor: EpisodeDescriptor = {
    source: 'moviebox',
    type: 'tv',
    tmdbId: fixtures.detail.detailPath,
    season: 1,
    episode: 1,
    description: `${fixtures.detail.title} S1E1`,
    title: fixtures.detail.title,
    metadata: {
      detailPath: fixtures.detail.detailPath,
      subjectId: fixtures.detail.subjectId,
      releaseDate: fixtures.detail.releaseDate,
      episodeTitle: 'Pilot'
    }
  };

  const result = await provider.fetchDownloads(descriptor);
  const mp4Entries = result.downloads['MP4'];
  assert.ok(mp4Entries && mp4Entries.length > 0);
  assert.strictEqual(result.subtitles.length, fixtures.downloads.subtitles.length);
});
