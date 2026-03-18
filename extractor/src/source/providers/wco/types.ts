export interface WcoSeriesSummary {
  title: string;
  url: string;
  thumbnail?: string;
}

export interface WcoEpisode {
  title: string;
  url: string;
}

export interface WcoSeriesDetail {
  title: string;
  url: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
  episodes: WcoEpisode[];
}

export interface WcoVideoInfo {
  url: string;
  hdUrl?: string;
  fullHdUrl?: string;
  filename: string;
}
