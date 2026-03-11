import { ExtractionResult, DownloadEntry } from '../extractor.js';

export interface QualityPreference {
  format: string | 'any';
  resolution: string | null;
}

export interface UserPreferences {
  subtitleLanguage: string | null;
  qualityPreference: QualityPreference;
}

export interface DownloadResult {
  entry: DownloadEntry;
  subtitleSent: boolean;
}
