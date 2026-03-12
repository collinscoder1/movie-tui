import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseSearchResponse,
  parseDetailResponse,
  parseDownloadResponse
} from '../../src/moviebox/index.js';

test('parse moviebox search response into normalized summaries', async () => {
  const file = path.join('test', 'moviebox', 'fixtures', 'search-response.json');
  const payload = JSON.parse(await readFile(file, 'utf-8'));
  const result = parseSearchResponse(payload);
  assert.strictEqual(result.pager.page, 1);
  assert.strictEqual(result.items.length, 2);
  const first = result.items[0];
  assert.deepStrictEqual(first, {
    subjectId: '989894703648756768',
    detailPath: 'grown-ish-oEQT6n9J7b1',
    title: 'Grown-ish S1-S6',
    releaseDate: '2018-01-03',
    type: 'tv',
    coverUrl: 'https://pbcdnw.aoneroom.com/image/2026/01/27/a9bfc1057cd047b82d03350d1c3941e6.jpg',
    hasResource: true
  });
});

test('detail payload yields seasons and episodes', async () => {
  const file = path.join('test', 'moviebox', 'fixtures', 'detail-response.json');
  const payload = JSON.parse(await readFile(file, 'utf-8'));
  const detail = parseDetailResponse(payload);
  assert.strictEqual(detail.subjectId, '989894703648756768');
  assert.strictEqual(detail.title, 'Grown-ish');
  assert.strictEqual(detail.seasons.length, 2);
  const [season1, season2] = detail.seasons;
  assert.strictEqual(season1.seasonNumber, 1);
  assert.strictEqual(season1.episodes.length, 13);
  assert.strictEqual(season2.episodes.length, 21);
});

test('download payload provides downloads and subtitles', async () => {
  const file = path.join('test', 'moviebox', 'fixtures', 'download-response.json');
  const payload = JSON.parse(await readFile(file, 'utf-8'));
  const result = parseDownloadResponse(payload);
  assert.strictEqual(result.downloads.length, 2);
  assert.strictEqual(result.subtitles.length, 2);
  assert.strictEqual(result.hasResource, true);
  assert.strictEqual(result.downloads[0].resolution, '360');
  assert.strictEqual(result.subtitles[0].lanName, 'English');
});
