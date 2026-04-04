import test, { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createAnikaiSource, resolveMegaupEmbedDownload } from '../../../src/source/providers/anikai/index.js';

const WATCH_URL = 'https://anikai.to/watch/go-for-it-nakamura-pggv#ep=2';
const DANDADAN_SEASON_1_URL = 'https://anikai.to/watch/dan-da-dan-vmly';
const DANDADAN_SEASON_2_URL = 'https://anikai.to/watch/dan-da-dan-season-2-8lk0';

function handleNetworkError(t: TestContext, err: unknown): void {
  const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code ?? (err as { code?: string })?.code;
  const message = (err as Error)?.message ?? '';

  if (message.includes('failed: 4') || message.includes('failed: 5') || message.includes('request failed: 4') || message.includes('request failed: 5')) {
    throw err as Error;
  }

  if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code ?? '')) {
    t.skip(`AnimeKAI live test skipped (${code})`);
    return;
  }

  throw err as Error;
}

test('AnimeKAI provider search returns the watch entry for Nakamura', async (t) => {
  try {
    const provider = createAnikaiSource();
    const results = await provider.searchByName('tv', 'nakamura');
    assert.ok(results.length > 0, 'expected at least one AnimeKAI search result');

    const match = results.find((entry) => entry.title === 'Go For It, Nakamura!');
    assert.ok(match, 'expected Nakamura to appear in AnimeKAI search results');
    assert.strictEqual(match?.tmdbId, 'https://anikai.to/watch/go-for-it-nakamura-pggv');
    assert.strictEqual(match?.metadata?.mediaKind, 'TV');
    assert.strictEqual(match?.metadata?.episodeCount, 13);
  } catch (err) {
    handleNetworkError(t, err);
  }
});

test('AnimeKAI provider describeFromUrl exposes a single season with all declared episodes', async (t) => {
  try {
    const provider = createAnikaiSource();
    const info = await provider.describeFromUrl(WATCH_URL);
    assert.strictEqual(info.type, 'tv');
    assert.strictEqual(info.title, 'Go For It, Nakamura!');
    assert.strictEqual(info.url, WATCH_URL);
    assert.strictEqual(info.season, 1);
    assert.strictEqual(info.episode, 2);
    assert.strictEqual(info.metadata?.animeId, 'cIe68w');
    assert.strictEqual(info.metadata?.episodeCount, 13);
    assert.ok(info.episodes.length >= 2);
    assert.strictEqual(info.episodes[0]?.episode_number, 1);
    assert.strictEqual(info.episodes[1]?.episode_number, 2);
    assert.strictEqual(info.episodes[1]?.metadata?.token, 'cN2yse_240-90G8Q2pKD');
  } catch (err) {
    handleNetworkError(t, err);
  }
});

test('AnimeKAI provider fetchShowDetails and fetchSeasonEpisodes stay aligned', async (t) => {
  try {
    const provider = createAnikaiSource();
    const details = await provider.fetchShowDetails('https://anikai.to/watch/go-for-it-nakamura-pggv');
    assert.strictEqual(details.name, 'Go For It, Nakamura!');
    assert.deepStrictEqual(details.seasons, [{ season_number: 1, episode_count: 13 }]);

    const episodes = await provider.fetchSeasonEpisodes('https://anikai.to/watch/go-for-it-nakamura-pggv', 1);
    assert.ok(episodes.length >= 2);
    assert.strictEqual(episodes[1]?.episode_number, 2);
  } catch (err) {
    handleNetworkError(t, err);
  }
});

test('AnimeKAI provider resolves all seasons from the selected Dan Da Dan watch page', async (t) => {
  try {
    const provider = createAnikaiSource();
    const details = await provider.fetchShowDetails(DANDADAN_SEASON_2_URL);
    assert.strictEqual(details.name, 'Dan Da Dan');
    assert.deepStrictEqual(details.seasons, [
      { season_number: 1, episode_count: 12 },
      { season_number: 2, episode_count: 12 }
    ]);

    const seasonTwoEpisodes = await provider.fetchSeasonEpisodes(DANDADAN_SEASON_1_URL, 2);
    assert.strictEqual(seasonTwoEpisodes.length, 12);
    assert.strictEqual(seasonTwoEpisodes[0]?.episode_number, 1);
    assert.strictEqual(seasonTwoEpisodes[0]?.metadata?.canonicalUrl, DANDADAN_SEASON_2_URL);
  } catch (err) {
    handleNetworkError(t, err);
  }
});

test('AnimeKAI provider describeFromUrl reports Dan Da Dan season 2 correctly', async (t) => {
  try {
    const provider = createAnikaiSource();
    const info = await provider.describeFromUrl(`${DANDADAN_SEASON_2_URL}#ep=1`);
    assert.strictEqual(info.type, 'tv');
    assert.strictEqual(info.title, 'Dan Da Dan');
    assert.strictEqual(info.url, `${DANDADAN_SEASON_2_URL}#ep=1`);
    assert.strictEqual(info.season, 2);
    assert.strictEqual(info.seasonNumber, 2);
    assert.strictEqual(info.episode, 1);
    assert.deepStrictEqual(info.metadata?.seasons, [
      {
        seasonNumber: 1,
        url: DANDADAN_SEASON_1_URL,
        episodeCount: 12,
        label: 'Season 1'
      },
      {
        seasonNumber: 2,
        url: DANDADAN_SEASON_2_URL,
        episodeCount: 12,
        label: 'Season 2'
      }
    ]);
  } catch (err) {
    handleNetworkError(t, err);
  }
});

test('AnimeKAI provider fetchDownloads resolves a Megaup download page through links/view', async (t) => {
  try {
    const provider = createAnikaiSource();
    const result = await provider.fetchDownloads({
      type: 'tv',
      tmdbId: 'https://anikai.to/watch/go-for-it-nakamura-pggv',
      season: 1,
      episode: 2,
      description: 'Go For It, Nakamura! Episode 2',
      title: 'Go For It, Nakamura!',
      metadata: {
        detailUrl: 'https://anikai.to/watch/go-for-it-nakamura-pggv'
      }
    });

    assert.strictEqual(result.type, 'tv');
    assert.ok(result.downloads.MP4?.length, 'expected at least one resolved final download URL');
    assert.ok(
      result.downloads.MP4?.some((entry) => /\/download$/.test(entry.url)),
      'expected one AnimeKAI final download URL to point at the Megaup file endpoint'
    );
    assert.strictEqual(result.downloadPage, WATCH_URL);
  } catch (err) {
    handleNetworkError(t, err);
  }
});

test('AnimeKAI Megaup embed resolution still returns the intermediate Megaup download page URL', async (t) => {
  try {
    const provider = createAnikaiSource();
    const result = await provider.fetchDownloads({
      type: 'tv',
      tmdbId: 'https://anikai.to/watch/go-for-it-nakamura-pggv',
      season: 1,
      episode: 2,
      description: 'Go For It, Nakamura! Episode 2',
      title: 'Go For It, Nakamura!',
      metadata: {
        detailUrl: 'https://anikai.to/watch/go-for-it-nakamura-pggv'
      }
    });

    const embed = result.downloads.EMBED?.find((entry) => entry.url.startsWith('https://megaup.'));
    if (!embed) {
      t.skip('No EMBED fallback entries were needed because final Megaup downloads resolved successfully');
      return;
    }

    const resolved = await resolveMegaupEmbedDownload(embed.url);
    assert.ok(resolved.downloadUrl, 'expected Megaup to expose an intermediate download page URL');
    assert.match(resolved.downloadUrl ?? '', /^https:\/\/megaup\.cc\/download\//);
    assert.strictEqual(resolved.decodedPayload.download, resolved.downloadUrl);
    assert.ok(Array.isArray(resolved.decodedPayload.sources), 'expected Megaup media payload to include sources');
  } catch (err) {
    handleNetworkError(t, err);
  }
});
