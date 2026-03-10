import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aoqxnzzjmarwakfutfnd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcXhuenpqbWFyd2FrZnV0Zm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzEyODQsImV4cCI6MjA4Njk0NzI4NH0.dtqWBzReYrDhJMq82K4omdFNB9BcvsRDXBYhBYMmaJ0';
const TMDB_API_KEY = '54e00466a09676df57ba51c4ca30b1a6';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const PROXY_HOST = 'https://dl.gemlelispe.workers.dev';

export type VidSrcType = 'movie' | 'tv';

interface ParsedInput {
  type: VidSrcType;
  id: string;
  idType: 'imdb' | 'tmdb';
  season: number | null;
  episode: number | null;
}

interface MovieMetadata {
  title: string;
  year: string;
}

interface TvMetadata extends MovieMetadata {
  episodeTitle: string;
  releaseDate: string;
}

export interface DownloadEntry {
  resolution: string | null;
  format: string;
  size: string;
  url: string;
}

interface SubtitleEntry {
  lanName: string;
  size: string;
  url: string;
}

export interface ExtractionResult {
  type: VidSrcType;
  tmdbId: string;
  metadata: MovieMetadata | TvMetadata;
  friendlyName: string;
  downloads: Record<string, DownloadEntry[]>;
  subtitles: SubtitleEntry[];
}

interface StorageAdapterLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

function createMemoryStorage(): StorageAdapterLike {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: createMemoryStorage() as StorageAdapterLike,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}

const defaultSupabaseClient = createSupabaseClient();

export function parseVidsrcUrl(value: string): ParsedInput {
  if (typeof value !== 'string') {
    throw new TypeError('URL must be a string');
  }
  const url = new URL(value);
  const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const type = segments[0];
  if (type === 'movie') {
    if (!segments[1]) {
      throw new Error('Missing identifier for movie');
    }
    const idSegment = segments[1];
    const isTmdb = idSegment.startsWith('tmdb-');
    const id = isTmdb ? idSegment.slice(5) : idSegment;
    return { type: 'movie', id, idType: isTmdb ? 'tmdb' : 'imdb', season: null, episode: null };
  }
  if (type === 'tv') {
    if (!segments[1] || !segments[2] || !segments[3]) {
      throw new Error('TV URL must include id, season and episode');
    }
    const idSegment = segments[1];
    const isTmdb = idSegment.startsWith('tmdb-');
    const id = isTmdb ? idSegment.slice(5) : idSegment;
    const season = Number.parseInt(segments[2], 10);
    const episode = Number.parseInt(segments[3], 10);
    if (!Number.isFinite(season) || !Number.isFinite(episode)) {
      throw new Error('Season and episode must be numeric');
    }
    return { type: 'tv', id, idType: isTmdb ? 'tmdb' : 'imdb', season, episode };
  }
  throw new Error('Unsupported vidSrc path: ' + url.pathname);
}

function formatSize(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, power)).toFixed(decimals)} ${units[power]}`;
}

function buildFriendlyName({ type, title, year, season, episode }: ParsedInput & MovieMetadata): string {
  const normalizedTitle = title || 'Unknown Title';
  const normalizedYear = year || 'Unknown';
  if (type === 'movie') {
    return `${normalizedTitle} (${normalizedYear})`;
  }
  return `${normalizedTitle} (${normalizedYear}) S${season ?? 0} E${episode ?? 0}`;
}

function buildProxyUrl(url: string, friendlyName: string): string {
  return `${PROXY_HOST}/${encodeURIComponent(url)}?n=${encodeURIComponent(friendlyName)}`;
}

async function resolveTmdbId(
  id: string,
  idType: 'imdb' | 'tmdb',
  type: VidSrcType,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<string | null> {
  if (idType === 'tmdb') {
    return id;
  }
  if (!id.startsWith('tt')) {
    return null;
  }
  const response = await fetchImpl(
    `${TMDB_BASE_URL}/find/${id}?api_key=${TMDB_API_KEY}&language=en-US&external_source=imdb_id`
  );
  const payload = await response.json();
  if (type === 'movie') {
    return payload.movie_results?.[0]?.id?.toString() ?? null;
  }
  return payload.tv_results?.[0]?.id?.toString() ?? null;
}

async function fetchMovieMetadata(
  tmdbId: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<MovieMetadata> {
  const response = await fetchImpl(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
  const payload = await response.json();
  return {
    title: payload.title || 'Unknown Title',
    year: payload.release_date ? new Date(payload.release_date).getFullYear().toString() : 'Unknown'
  };
}

async function fetchTvMetadata(
  tmdbId: string,
  season: number,
  episode: number,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<TvMetadata> {
  const [showResponse, episodeResponse] = await Promise.all([
    fetchImpl(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
    fetchImpl(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}&language=en-US`)
  ]);
  const show = await showResponse.json();
  const episodePayload = await episodeResponse.json();
  return {
    title: show.name || 'Unknown Show',
    year: show.first_air_date ? new Date(show.first_air_date).getFullYear().toString() : 'Unknown',
    episodeTitle: episodePayload.name || 'Unknown Episode',
    releaseDate: episodePayload.air_date || 'Unknown'
  };
}

type DownloadProxyResult = {
  downloads: Record<string, DownloadEntry[]>;
  subtitles: SubtitleEntry[];
};

async function invokeDownloadProxy(
  payload: {
    type: VidSrcType;
    tmdbId: string;
    season: number | null;
    episode: number | null;
    supabaseClient?: SupabaseClient;
  },
  friendlyName: string
): Promise<DownloadProxyResult> {
  const client = payload.supabaseClient ?? defaultSupabaseClient;
  const { data: tokenData, error: tokenError } = await client.functions.invoke<{ t?: string }>('get-token');
  if (tokenError) {
    throw tokenError;
  }
  const requestToken = tokenData?.t ?? '';
  const { data: proxyData, error } = await client.functions.invoke<{
    extractData?: {
      data?: {
        streams?: Array<Record<string, unknown>>;
        downloads?: Array<Record<string, unknown>>;
        captions?: Array<Record<string, unknown>>;
      };
    };
    mkvData?: { files?: Array<Record<string, unknown>> };
  }>('download-proxy', {
    headers: { 'x-request-token': requestToken },
    body: {
      type: payload.type,
      tmdbId: payload.tmdbId,
      season: payload.season,
      episode: payload.episode
    }
  });
  if (error) {
    throw error;
  }
  const extractData = proxyData?.extractData?.data ?? null;
  const mkvData = proxyData?.mkvData ?? null;
  const downloads: DownloadEntry[] = [];
  if (extractData?.streams) {
    for (const stream of extractData.streams) {
      if (!stream.size || !stream.url) {
        continue;
      }
      const sizeRaw = typeof stream.size === 'number' ? stream.size : Number(stream.size);
      downloads.push({
        resolution: (stream.resolutions as string) || (stream.resolution as string) || null,
        format: (stream.format as string) || 'MP4',
        size: formatSize(sizeRaw),
        url: buildProxyUrl(stream.url as string, friendlyName)
      });
    }
  }
  if (extractData?.downloads) {
    for (const entry of extractData.downloads) {
      if (!entry.size || !entry.url) {
        continue;
      }
      const sizeRaw = typeof entry.size === 'number' ? entry.size : Number(entry.size);
      downloads.push({
        resolution: (entry.resolution as string) ?? null,
        format: 'MP4',
        size: formatSize(sizeRaw),
        url: buildProxyUrl(entry.url as string, friendlyName)
      });
    }
  }
  if (mkvData?.files?.[0]?.url) {
    const file = mkvData.files[0];
    const sizeRaw = file.size;
    downloads.push({
      resolution: '480',
      format: 'MKV',
      size: typeof sizeRaw === 'number' ? formatSize(sizeRaw) : String(sizeRaw ?? 'Unknown'),
      url: file.url as string
    });
  }

  const grouped = downloads.reduce<Record<string, DownloadEntry[]>>((acc, entry) => {
    const bucket = entry.format || 'Other';
    if (!acc[bucket]) {
      acc[bucket] = [];
    }
    acc[bucket].push(entry);
    return acc;
  }, {});

  const subtitles: SubtitleEntry[] = [];
  if (extractData?.captions) {
    const friendlySubtitleName = friendlyName.replace(/\s+/g, ' ');
    for (const caption of extractData.captions) {
      if (!caption.size || !caption.url || !caption.lanName) {
        continue;
      }
      const sizeRaw = typeof caption.size === 'number' ? caption.size : Number(caption.size);
      subtitles.push({
        lanName: caption.lanName as string,
        size: formatSize(sizeRaw),
        url: `https://sub.k5s7sjozpn.workers.dev/?url=${encodeURIComponent(caption.url as string)}&title=${encodeURIComponent(
          friendlySubtitleName
        )}`
      });
    }
  }

  return { downloads: grouped, subtitles };
}

export async function extractVidsrcLinks(
  input: string,
  options: { fetchImpl?: typeof fetch; supabaseClient?: SupabaseClient } = {}
): Promise<ExtractionResult> {
  const parsed = parseVidsrcUrl(input);
  const tmdbId = await resolveTmdbId(parsed.id, parsed.idType, parsed.type, options.fetchImpl);
  if (!tmdbId) {
    throw new Error('Unable to resolve TMDb identifier');
  }
  let metadata: MovieMetadata | TvMetadata;
  if (parsed.type === 'movie') {
    metadata = await fetchMovieMetadata(tmdbId, options.fetchImpl);
  } else {
    metadata = await fetchTvMetadata(tmdbId, parsed.season ?? 0, parsed.episode ?? 0, options.fetchImpl);
  }
  const friendlyName = buildFriendlyName({ type: parsed.type, id: parsed.id, idType: parsed.idType, season: parsed.season, episode: parsed.episode, ...metadata });
  const downloadPayload = await invokeDownloadProxy(
    {
      type: parsed.type,
      tmdbId,
      season: parsed.season,
      episode: parsed.episode,
      supabaseClient: options.supabaseClient
    },
    friendlyName
  );
  return {
    type: parsed.type,
    tmdbId,
    metadata,
    friendlyName,
    downloads: downloadPayload.downloads,
    subtitles: downloadPayload.subtitles
  };
}

export const helpers = {
  formatSize,
  parseVidsrcUrl,
  buildFriendlyName,
  buildProxyUrl
};
