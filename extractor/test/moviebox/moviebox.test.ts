import test, { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { getDownloadLinks, getSubjectDetail, searchSubjects } from '../../src/moviebox/index.js';

const DETAIL_PATH = 'the-chi-0OZDg6KP353';
const SEARCH_KEYWORD = 'the chi';

function handleNetworkError(t: TestContext, err: unknown): void {
  const code = (err as any)?.cause?.code ?? (err as any)?.code;
  if (code === 'EAI_AGAIN' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    t.skip(`moviebox API unreachable (${code})`);
    return;
  }
  throw err;
}

test('moviebox search uses live data', async (t) => {
  try {
    const result = await searchSubjects({ keyword: SEARCH_KEYWORD, subjectType: 2, perPage: 10 });
    assert.ok(result.items.length > 0, 'search should return at least one subject');
    assert.ok(
      result.items.some((item) => item.detailPath === DETAIL_PATH),
      `search results should include ${DETAIL_PATH}`
    );
  } catch (err) {
    handleNetworkError(t, err);
    return;
  }
});

test('detail payload yields seasons and episodes from live data', async (t) => {
  try {
    const detail = await getSubjectDetail(DETAIL_PATH);
    assert.ok(detail.seasons.length > 0, 'detail should include at least one season');
    assert.ok(
      detail.seasons.some((season) => season.episodes.length > 0),
      'at least one season should expose episodes'
    );
  } catch (err) {
    handleNetworkError(t, err);
    return;
  }
});

test('download payload provides downloads and subtitles from live data', async (t) => {
  try {
    const detail = await getSubjectDetail(DETAIL_PATH);
    assert.ok(detail.hasResource, 'detail should report downloadable resources');
    const season = detail.seasons.find((entry) => entry.episodes.length > 0);
    assert.ok(season, 'unable to find a season with episodes to download');
    const episode = season.episodes[0];
    assert.ok(episode, `season ${season?.seasonNumber ?? 'unknown'} should expose an episode`);
    const downloadResult = await getDownloadLinks(detail.subjectId, season.seasonNumber, episode.episode, DETAIL_PATH);
    assert.ok(downloadResult.downloads.length > 0, 'download response should include entries');
    assert.ok(downloadResult.hasResource, 'download response should report hasResource');
  } catch (err) {
    handleNetworkError(t, err);
    return;
  }
});
