import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { createSource, SourceKey, MediaSource, SearchResult } from '../../../source/index.js';
import { SourceTvSeasonInfo, SourceMovieInfo, MediaType } from '../../../source/types.js';
import { Config } from '../../../config.js';
import { colors, symbols } from '../../theme.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { SourceStep } from './SourceStep.js';
import { ModeStep } from './ModeStep.js';
import { MediaTypeStep } from './MediaTypeStep.js';
import { QueryStep } from './QueryStep.js';
import { ResultsStep } from './ResultsStep.js';

type SearchStep = 'source' | 'mode' | 'mediaType' | 'query' | 'searching' | 'results' | 'fetchingDetails';
type SearchMode = 'url' | 'tmdb' | 'name';

interface SearchScreenProps {
  config: Config;
  onMediaSelected: (info: SourceTvSeasonInfo | SourceMovieInfo, source: MediaSource, config: Config) => void;
  onBack: () => void;
}

export function SearchScreen({ config, onMediaSelected, onBack }: SearchScreenProps) {
  const [step, setStep] = useState<SearchStep>('source');
  const [sourceKey, setSourceKey] = useState<SourceKey | null>(null);
  const [source, setSource] = useState<MediaSource | null>(null);
  const [mode, setMode] = useState<SearchMode | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');

  const breadcrumb = ['Home', 'Search'];
  if (sourceKey) breadcrumb.push(sourceKey);
  if (mode) breadcrumb.push(mode);
  if (mediaType) breadcrumb.push(mediaType);

  useInput((_input, key) => {
    if (!key.escape) return;
    setError(null);
    switch (step) {
      case 'source': onBack(); break;
      case 'mode': setStep('source'); setSourceKey(null); setSource(null); break;
      case 'mediaType': setStep('mode'); setMode(null); break;
      case 'query':
        if (mode === 'url') { setStep('source'); setSourceKey(null); setSource(null); setMode(null); }
        else { setStep('mediaType'); setMediaType(null); }
        break;
      case 'results': setStep('query'); break;
    }
  });

  function handleSourceSelect(value: string) {
    if (value === '_back') { onBack(); return; }
    const key = value as SourceKey;
    setSourceKey(key);
    setSource(createSource(key));
    setStep('mode');
  }

  function handleModeSelect(value: string) {
    if (value === '_back') { setStep('source'); setSourceKey(null); setSource(null); return; }
    setMode(value as SearchMode);
    if (value === 'url') {
      setStep('query');
    } else {
      setStep('mediaType');
    }
  }

  function handleMediaTypeSelect(value: string) {
    if (value === '_back') { setStep('mode'); setMode(null); return; }
    setMediaType(value as MediaType);
    setStep('query');
  }

  async function handleQuerySubmit(value: string) {
    if (!value.trim()) return;
    setError(null);

    if (mode === 'url') {
      setStep('fetchingDetails');
      setStatusText('Fetching media info...');
      try {
        const info = await source!.describeFromUrl(value.trim());
        if (info.type === 'movie') {
          onMediaSelected({ type: 'movie', tmdbId: info.tmdbId, title: info.title, metadata: info.metadata }, source!, config);
        } else {
          onMediaSelected({
            type: 'tv',
            tmdbId: info.tmdbId,
            title: info.title,
            seasonNumber: info.season ?? (info as any).seasonNumber,
            episodes: info.episodes,
            metadata: info.metadata,
          } as SourceTvSeasonInfo, source!, config);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep('query');
      }
      return;
    }

    if (mode === 'tmdb') {
      setStep('fetchingDetails');
      setStatusText('Fetching from TMDb...');
      try {
        if (mediaType === 'movie') {
          const details = await source!.fetchMovieMetadata(value.trim());
          onMediaSelected({ type: 'movie', tmdbId: value.trim(), title: details.title, metadata: (details as any).metadata }, source!, config);
        } else {
          const show = await source!.fetchShowDetails(value.trim());
          onMediaSelected({
            type: 'tv',
            tmdbId: value.trim(),
            title: show.name,
            seasonNumber: -1,
            episodes: [],
            metadata: { ...show.metadata, _seasons: show.seasons },
          } as SourceTvSeasonInfo, source!, config);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep('query');
      }
      return;
    }

    // Search by name
    setStep('searching');
    setStatusText(`Searching for "${value.trim()}"...`);
    try {
      const results = await source!.searchByName(mediaType!, value.trim());
      if (results.length === 0) {
        setError('No results found.');
        setStep('query');
        return;
      }
      setSearchResults(results);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('query');
    }
  }

  async function handleResultSelect(value: string) {
    if (value === '_back') { setStep('query'); return; }
    const index = parseInt(value, 10);
    const selected = searchResults[index];
    if (!selected) return;

    setStep('fetchingDetails');
    setStatusText(`Loading ${selected.title}...`);
    try {
      if (mediaType === 'movie') {
        const details = await source!.fetchMovieMetadata(selected.tmdbId);
        onMediaSelected({ type: 'movie', tmdbId: selected.tmdbId, title: details.title, metadata: (details as any).metadata }, source!, config);
      } else {
        const show = await source!.fetchShowDetails(selected.tmdbId);
        onMediaSelected({
          type: 'tv',
          tmdbId: selected.tmdbId,
          title: show.name,
          seasonNumber: -1,
          episodes: [],
          metadata: { ...show.metadata, _seasons: show.seasons },
        } as SourceTvSeasonInfo, source!, config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('results');
    }
  }

  return (
    <Box flexDirection="column">
      <Header breadcrumb={breadcrumb} />

      {error && (
        <Box paddingLeft={4} marginBottom={1}>
          <Text color={colors.error}>{`${symbols.cross}  ${error}`}</Text>
        </Box>
      )}

      {step === 'source' && <SourceStep onSelect={handleSourceSelect} />}
      {step === 'mode' && sourceKey && <ModeStep sourceKey={sourceKey} onSelect={handleModeSelect} />}
      {step === 'mediaType' && <MediaTypeStep onSelect={handleMediaTypeSelect} />}
      {step === 'query' && mode && <QueryStep mode={mode} onSubmit={handleQuerySubmit} />}

      {(step === 'searching' || step === 'fetchingDetails') && (
        <Box paddingLeft={4}>
          <Spinner label={statusText} />
        </Box>
      )}

      {step === 'results' && <ResultsStep results={searchResults} onSelect={handleResultSelect} />}

      <StatusBar />
    </Box>
  );
}
