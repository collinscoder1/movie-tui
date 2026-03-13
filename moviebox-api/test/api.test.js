import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSubjects, getSubjectDetail, getDownloadLinks, pickSeasonEpisode } from '../src/api.js';

const SEARCH_KEYWORD = 'The Chi';
const DETAIL_PATH = 'the-chi-0OZDg6KP353';
let cachedSubject = null;
let cachedDetail = null;

function handleNetworkError(t, err) {
  const code = err?.cause?.code ?? err?.code;
  if (code === 'EAI_AGAIN' || code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
    t.skip(`moviebox API unreachable (${code})`);
    return true;
  }
  return false;
}

test('search returns live subjects', async (t) => {
  try {
    const result = await searchSubjects({ keyword: SEARCH_KEYWORD, subjectType: 2, perPage: 20 });
    assert.ok(Array.isArray(result.items), 'items should be an array');
    assert.ok(result.items.length > 0, 'expected at least one subject');
    const detailSubject = result.items.find((item) => item.detailPath === DETAIL_PATH);
    assert.ok(detailSubject, `search should include ${DETAIL_PATH}`);
    cachedSubject = detailSubject;
  } catch (err) {
    if (handleNetworkError(t, err)) return;
    throw err;
  }
});

test('detail respects search result', async (t) => {
  if (!cachedSubject) {
    t.skip('search did not populate a subject');
    return;
  }
  try {
    const detail = await getSubjectDetail(cachedSubject.detailPath);
    assert.strictEqual(detail.detailPath, cachedSubject.detailPath, 'detailPath should match');
    assert.ok(detail.subjectId, 'detail should include subjectId');
    const seasons =
      Array.isArray(detail?.seasonList) ? detail.seasonList :
      Array.isArray(detail?.seasons) ? detail.seasons :
      Array.isArray(detail?.resource?.seasons) ? detail.resource.seasons :
      [];
    if (seasons.length > 0) {
      const hasEpisodes = seasons.some((season) => {
        return (
          (Array.isArray(season?.episodes) && season.episodes.length > 0) ||
          Array.isArray(season?.episodeList) ||
          Array.isArray(season?.list) ||
          Array.isArray(season?.videoList) ||
          Array.isArray(season?.videos)
        );
      });
      assert.ok(hasEpisodes, 'if seasons exist they should expose episodes or lists');
    } else {
      t.log('no season arrays were returned, but detail contains subject metadata');
    }
    cachedDetail = detail;
  } catch (err) {
    if (handleNetworkError(t, err)) return;
    throw err;
  }
});

test('download uses detail metadata to fetch links', async (t) => {
  if (!cachedDetail) {
    t.skip('detail data missing from previous test');
    return;
  }
  try {
    const identifiers = {
      subjectId: cachedDetail.subjectId,
      detailPath: cachedDetail.detailPath ?? cachedSubject.detailPath
    };
    assert.ok(identifiers.subjectId, 'subjectId is required for download');
    assert.ok(identifiers.detailPath, 'detailPath is required for download');
    const { season, episode } = pickSeasonEpisode(cachedDetail);
    const downloadResult = await getDownloadLinks(
      identifiers.subjectId,
      season,
      episode,
      identifiers.detailPath
    );
    assert.ok(Array.isArray(downloadResult.downloads), 'downloads array is expected');
    assert.ok(downloadResult.downloads.length > 0, 'downloads should not be empty');
    assert.ok(downloadResult.hasResource !== false, 'download result should report resources');
  } catch (err) {
    if (handleNetworkError(t, err)) return;
    throw err;
  }
});
