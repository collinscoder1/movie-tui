export type MovieboxSubjectType = 0 | 1 | 2 | 5 | 6;

export interface RawSubjectItem {
  subjectId: string;
  subjectType: MovieboxSubjectType;
  title: string;
  detailPath: string;
  releaseDate?: string;
  hasResource?: boolean;
  cover?: { url?: string };
}

export interface RawSearchPager {
  hasMore?: boolean;
  nextPage?: string;
  page?: string | number;
  perPage?: string | number;
  totalCount?: number;
}

export interface RawSearchResponse {
  code: number;
  message: string;
  data: {
    pager?: RawSearchPager;
    items?: RawSubjectItem[];
  };
}

export interface SubjectSummary {
  subjectId: string;
  detailPath: string;
  title: string;
  releaseDate?: string;
  type: 'movie' | 'tv' | 'anime' | 'other';
  coverUrl?: string;
  hasResource: boolean;
}

export interface ShortPager {
  hasMore: boolean;
  page: number;
  perPage: number;
  totalCount: number;
}

export interface MovieboxSeason {
  seasonNumber: number;
  episodes: MovieboxEpisode[];
}

export interface MovieboxEpisode {
  season: number;
  episode: number;
  title?: string;
  detailPath: string;
  subjectId: string;
}

export interface MovieboxSubjectDetail {
  subjectId: string;
  detailPath: string;
  title: string;
  type: 'movie' | 'tv' | 'anime' | 'other';
  releaseDate?: string;
  hasResource: boolean;
  coverUrl?: string;
  seasons: MovieboxSeason[];
  metadata?: Record<string, unknown>;
}

export type RawEpisodeEntry = {
  ep?: number;
  episode?: number;
  episodeNum?: number;
  epNum?: number;
  title?: string;
  name?: string;
  se?: number;
  season?: number;
  seasonNum?: number;
  seasonNumber?: number;
};

export interface RawSeason {
  se?: number;
  maxEp?: number | string;
  season?: number;
  seasonNum?: number;
  seasonNumber?: number;
  allEp?: string;
  resolutions?: Array<{ resolution?: number; epNum?: number }>;
  episodes?: RawEpisodeEntry[];
  episodeList?: RawEpisodeEntry[];
  list?: RawEpisodeEntry[];
  videoList?: RawEpisodeEntry[];
  videos?: RawEpisodeEntry[];
}

export interface RawDetailResponse {
  code: number;
  message: string;
  data: {
    subject: RawSubjectDetail;
    resource?: {
      seasons?: RawSeason[];
    };
    metadata?: Record<string, unknown>;
  };
}

export interface RawSubjectDetail {
  subjectId: string;
  subjectType: MovieboxSubjectType;
  title: string;
  detailPath: string;
  releaseDate?: string;
  hasResource?: boolean;
  cover?: { url?: string };
  resource?: {
    seasons?: RawSeason[];
  };
  seasonList?: RawSeason[];
  seasons?: RawSeason[];
}

export interface RawDownloadResponse {
  code: number;
  message: string;
  data: {
    downloads?: Array<{ format?: string; resolution?: number | string; url: string; size?: number | string }>;
    captions?: Array<{ lanName?: string; url: string; size?: number | string }>;
    hasResource?: boolean;
  };
}

export interface MovieboxDownloadEntry {
  format: string;
  resolution: string | null;
  url: string;
  size?: string;
}

export interface MovieboxSubtitleEntry {
  lanName: string;
  url: string;
  size?: string;
}

export interface MovieboxDownloadResult {
  downloads: MovieboxDownloadEntry[];
  subtitles: MovieboxSubtitleEntry[];
  hasResource: boolean;
}
