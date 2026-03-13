const BASE_URL = 'https://h5-api.aoneroom.com';

function getTimezone() {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC';
}

function buildHeaders(locale = 'en') {
  return {
    'content-type': 'application/json',
    accept: 'application/json',
    'x-request-lang': locale,
    'x-client-info': JSON.stringify({ timezone: getTimezone() })
  };
}

async function send(path, { method = 'GET', body, locale = 'en', signal } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: buildHeaders(locale),
    signal
  };

  if (method !== 'GET' && body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Moviebox API ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload || payload.code !== 0) {
    const message = payload?.message ?? 'unknown';
    throw new Error(`Moviebox API error: ${message}`);
  }

  return payload;
}

export async function searchSubjects({ keyword, page = 1, perPage = 30, subjectType, locale } = {}) {
  if (!keyword || !keyword.trim()) {
    throw new Error('keyword is required');
  }
  const body = { keyword: keyword.trim(), page, perPage };
  if (subjectType !== undefined) {
    body.subjectType = subjectType;
  }
  const payload = await send('/wefeed-h5api-bff/subject/search', {
    method: 'POST',
    body,
    locale
  });
  const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
  const pager = payload.data?.pager ?? {};
  return {
    items,
    pager
  };
}

export async function getSubjectDetail(detailPath, { locale, signal } = {}) {
  if (!detailPath || !detailPath.trim()) {
    throw new Error('detailPath is required');
  }
  const query = new URLSearchParams({ detailPath: detailPath.trim() });
  const payload = await send(`/wefeed-h5api-bff/detail?${query.toString()}`, {
    locale,
    signal
  });
  const subject = payload.data?.subject;
  if (!subject) {
    return payload.data ?? payload;
  }
  const downloadData = await fetchDownloadData(subject.subjectId, 1, 1, detailPath, { locale, signal });
  const seasons = buildSeasonsFromDownloadData(subject, downloadData?.resource);
  return {
    subjectId: subject.subjectId,
    detailPath: subject.detailPath,
    title: subject.title,
    type: getSubjectType(subject.subjectType),
    releaseDate: subject.releaseDate,
    hasResource: subject.hasResource ?? false,
    coverUrl: subject.cover?.url,
    seasons
  };
}

export async function getDownloadLinks(subjectId, season, episode, detailPath, { locale, signal } = {}) {
  if (!subjectId || !detailPath) {
    throw new Error('subjectId and detailPath are required');
  }
  const query = new URLSearchParams({
    subjectId,
    se: String(season ?? 1),
    ep: String(episode ?? 1),
    detailPath
  });
  return fetchDownloadData(subjectId, season ?? 1, episode ?? 1, detailPath, { locale, signal });
}

function toFiniteNumber(value) {
  if (value === undefined || value === null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseSeasonNumber(entry, fallback) {
  return (
    toFiniteNumber(entry?.se) ??
    toFiniteNumber(entry?.season) ??
    toFiniteNumber(entry?.seasonNum) ??
    toFiniteNumber(entry?.seasonNumber) ??
    fallback
  );
}

function parseEpisodeNumber(entry) {
  return (
    toFiniteNumber(entry?.ep) ??
    toFiniteNumber(entry?.episode) ??
    toFiniteNumber(entry?.episodeNum) ??
    toFiniteNumber(entry?.epNum)
  );
}

function collectEpisodeEntries(season) {
  return (
    season?.episodes ??
    season?.episodeList ??
    season?.list ??
    season?.videoList ??
    season?.videos ??
    []
  );
}

function parseEpisodeNumbersFromSeason(season) {
  const explicit = collectEpisodeEntries(season);
  if (Array.isArray(explicit) && explicit.length > 0) {
    const parsed = explicit
      .map((entry) => parseEpisodeNumber(entry))
      .filter((value) => value !== null);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (typeof season?.allEp === 'string' && season.allEp.trim()) {
    const values = season.allEp
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (values.length > 0) {
      return values;
    }
  }

  const maxEp = toFiniteNumber(season?.maxEp);
  if (maxEp && maxEp > 0) {
    return [1];
  }

  if (Array.isArray(season?.resolutions)) {
    const parsed = season.resolutions
      .map((item) => toFiniteNumber(item?.epNum))
      .filter((value) => value !== null);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [];
}

function extractSeasonSources(subject) {
  const sources = [];
  if (Array.isArray(subject?.seasonList)) sources.push(...subject.seasonList);
  if (Array.isArray(subject?.seasons)) sources.push(...subject.seasons);
  if (Array.isArray(subject?.resource?.seasons)) sources.push(...subject.resource.seasons);
  return sources;
}

export function pickSeasonEpisode(subjectDetail) {
  const fallbackSeason = 1;
  const sources = extractSeasonSources(subjectDetail);
  for (const season of sources) {
    const seasonNumber = parseSeasonNumber(season, fallbackSeason);
    const episodes = parseEpisodeNumbersFromSeason(season);
    if (episodes.length > 0) {
      return { season: seasonNumber, episode: episodes[0] };
    }
  }
  return { season: fallbackSeason, episode: 1 };
}

async function fetchDownloadData(
  subjectId,
  season,
  episode,
  detailPath,
  { locale, signal } = {}
) {
  const query = new URLSearchParams({
    subjectId,
    se: String(season),
    ep: String(episode),
    detailPath
  });
  const payload = await send(`/wefeed-h5api-bff/subject/download?${query.toString()}`, {
    locale,
    signal
  });
  return payload.data;
}

function getSubjectType(subjectType) {
  switch (subjectType) {
    case 1:
      return 'movie';
    case 2:
      return 'tv';
    case 6:
      return 'anime';
    default:
      return 'other';
  }
}

function getEpisodeNumbersFromResourceSeason(season) {
  const fromResolutions = Array.isArray(season?.resolutions)
    ? season.resolutions
        .map((entry) => toFiniteNumber(entry?.epNum))
        .filter((num) => num !== null)
    : [];
  if (fromResolutions.length > 0) {
    return Array.from(new Set(fromResolutions)).sort((a, b) => a - b);
  }
  const maxEp = toFiniteNumber(season?.maxEp);
  if (maxEp && maxEp > 0) {
    return Array.from({ length: maxEp }, (_, idx) => idx + 1);
  }
  return [1];
}

function buildSeasonsFromDownloadData(subject, resource = {}) {
  const seasonsList = Array.isArray(resource.seasons) ? resource.seasons : [];
  return seasonsList.map((season) => {
    const seasonNumber = parseSeasonNumber(season, 1);
    const episodeNumbers = getEpisodeNumbersFromResourceSeason(season);
    const episodes = episodeNumbers.map((number) => ({
      season: seasonNumber,
      episode: number,
      detailPath: subject.detailPath,
      subjectId: subject.subjectId
    }));
    return {
      seasonNumber,
      episodes
    };
  });
}
