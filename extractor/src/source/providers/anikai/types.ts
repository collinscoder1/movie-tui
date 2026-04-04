export type AnikaiMediaKind = 'MOVIE' | 'TV' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC' | string;

export interface AnikaiSearchEntry {
  title: string;
  url: string;
  kind: AnikaiMediaKind | null;
  episodeCount: number | null;
  subCount: number | null;
  dubCount: number | null;
}

export interface AnikaiEpisode {
  episode: number;
  title: string;
  token?: string | null;
  slug?: string | null;
  langs?: number | null;
}

export interface AnikaiSeasonLink {
  seasonNumber: number;
  url: string;
  episodeCount: number | null;
  label: string;
  isCurrent?: boolean;
}

export interface AnikaiServerEntry {
  category: string;
  sid: string;
  eid: string;
  lid: string;
  label: string;
}

export interface AnikaiResolvedEmbed {
  lid: string;
  url: string;
  server: AnikaiServerEntry;
}

export interface AnikaiWatchDetail {
  title: string;
  url: string;
  canonicalUrl: string;
  seriesUrl: string;
  currentSeasonNumber: number | null;
  animeId: string | null;
  mediaKind: AnikaiMediaKind | null;
  episodeCount: number | null;
  currentEpisode: number | null;
  seasons: AnikaiSeasonLink[];
  episodes: AnikaiEpisode[];
}
