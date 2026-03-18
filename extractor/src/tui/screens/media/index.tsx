import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { EpisodeDescriptor, MediaSource } from '../../../source/index.js';
import { SourceTvSeasonInfo, SourceMovieInfo, SourceEpisode } from '../../../source/types.js';
import { Config } from '../../../config.js';
import { checkExistingDownloads, formatVerificationResults } from '../../file-checker.js';
import { parseEpisodeInput } from '../../../source/index.js';
import { colors, symbols } from '../../theme.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { SeasonStep } from './SeasonStep.js';
import { ActionStep } from './ActionStep.js';
import { EpisodesStep } from './EpisodesStep.js';
import { EpisodeSelectStep } from './EpisodeSelectStep.js';
import { EpisodeInputStep } from './EpisodeInputStep.js';
import { ResolutionStep } from './ResolutionStep.js';
import { VerifyStep } from './VerifyStep.js';

type ActionType = 'download' | 'verify' | 'undownloaded';
type MediaStep = 'season' | 'action' | 'episodes' | 'episodeSelect' | 'episodeInput' | 'resolution' | 'loading' | 'verify';

interface MediaScreenProps {
  mediaInfo: SourceTvSeasonInfo | SourceMovieInfo;
  source: MediaSource;
  config: Config;
  onDownload: (descriptors: EpisodeDescriptor[], resolution: string | null) => void;
  onBack: () => void;
}

export function MediaScreen({ mediaInfo, source, config, onDownload, onBack }: MediaScreenProps) {
  const isMovie = mediaInfo.type === 'movie';
  const [step, setStep] = useState<MediaStep>(
    !isMovie && (mediaInfo as SourceTvSeasonInfo).seasonNumber === -1 ? 'season' : 'action'
  );
  const [seasonInfo, setSeasonInfo] = useState<SourceTvSeasonInfo | null>(
    !isMovie && (mediaInfo as SourceTvSeasonInfo).seasonNumber !== -1 ? mediaInfo as SourceTvSeasonInfo : null
  );
  const [action, setAction] = useState<ActionType | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<SourceEpisode[]>([]);
  const [verificationText, setVerificationText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('');

  const seasons = !isMovie ? ((mediaInfo as SourceTvSeasonInfo).metadata?._seasons as Array<{ season_number: number; episode_count?: number }>) ?? [] : [];

  const breadcrumb = ['Home', 'Search', mediaInfo.title];
  if (seasonInfo) breadcrumb.push(`S${seasonInfo.seasonNumber}`);

  useInput((_input, key) => {
    if (!key.escape) return;
    setError(null);
    switch (step) {
      case 'season': onBack(); break;
      case 'action':
        if (!isMovie && seasons.length > 0) {
          setStep('season');
          setSeasonInfo(null);
        } else {
          onBack();
        }
        break;
      case 'episodes': setStep('action'); setAction(null); break;
      case 'episodeSelect': setStep('episodes'); break;
      case 'episodeInput': setStep('episodes'); break;
      case 'resolution':
        if (isMovie) setStep('action');
        else setStep('episodes');
        break;
      case 'verify': setStep('action'); setAction(null); break;
    }
  });

  async function handleSeasonSelect(value: string) {
    if (value === '_back') { onBack(); return; }
    const seasonNum = parseInt(value, 10);
    setStep('loading');
    setLoadingText(`Loading Season ${seasonNum}...`);
    try {
      const episodes = await source.fetchSeasonEpisodes(mediaInfo.tmdbId, seasonNum);
      const info: SourceTvSeasonInfo = {
        type: 'tv',
        tmdbId: mediaInfo.tmdbId,
        title: mediaInfo.title,
        seasonNumber: seasonNum,
        episodes: episodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name, metadata: ep.metadata })),
        metadata: mediaInfo.metadata,
      };
      setSeasonInfo(info);
      setStep('action');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('season');
    }
  }

  function buildDescriptors(episodes?: SourceEpisode[]): EpisodeDescriptor[] {
    if (isMovie) {
      return [{
        type: 'movie',
        tmdbId: mediaInfo.tmdbId,
        season: null,
        episode: null,
        description: `${mediaInfo.title} (movie)`,
        title: mediaInfo.title,
        metadata: mediaInfo.metadata,
      }];
    }
    const eps = episodes ?? seasonInfo!.episodes;
    return eps.map(ep => ({
      type: 'tv' as const,
      tmdbId: mediaInfo.tmdbId,
      season: seasonInfo!.seasonNumber,
      episode: ep.episode_number,
      description: `${mediaInfo.title} S${seasonInfo!.seasonNumber}E${ep.episode_number}`,
      title: mediaInfo.title,
      metadata: mediaInfo.metadata,
    }));
  }

  async function handleActionSelect(value: string) {
    if (value === '_back') {
      if (!isMovie && seasons.length > 0) {
        setStep('season');
        setSeasonInfo(null);
      } else {
        onBack();
      }
      return;
    }
    const act = value as ActionType;
    setAction(act);

    if (act === 'verify') {
      setStep('loading');
      setLoadingText('Checking existing downloads...');
      const descriptors = buildDescriptors();
      const { downloaded } = await checkExistingDownloads(descriptors, config.downloadPath);
      setVerificationText(formatVerificationResults(descriptors, downloaded));
      setStep('verify');
      return;
    }

    if (isMovie) {
      if (act === 'undownloaded') {
        setStep('loading');
        setLoadingText('Checking existing downloads...');
        const descriptors = buildDescriptors();
        const { missing } = await checkExistingDownloads(descriptors, config.downloadPath);
        if (missing.length === 0) {
          setVerificationText('Movie already downloaded!');
          setStep('verify');
          return;
        }
      }
      setStep('resolution');
      return;
    }

    setStep('episodes');
  }

  function handleEpisodeSelectionMode(value: string) {
    if (value === '_back') { setStep('action'); setAction(null); return; }
    if (value === 'all') {
      setSelectedEpisodes(seasonInfo!.episodes);
      setStep('resolution');
    } else if (value === 'select') {
      setStep('episodeSelect');
    } else if (value === 'custom') {
      setStep('episodeInput');
    }
  }

  function handleEpisodeMultiSelectSubmit(values: string[]) {
    if (values.length === 0) {
      setError('No episodes selected.');
      return;
    }
    setError(null);
    const episodeNumbers = values.map(v => parseInt(v, 10));
    const eps = seasonInfo!.episodes.filter(ep => episodeNumbers.includes(ep.episode_number));
    setSelectedEpisodes(eps);
    setStep('resolution');
  }

  function handleEpisodeInput(value: string) {
    if (!value.trim()) return;
    const available = seasonInfo!.episodes.map(ep => ep.episode_number);
    const parsed = parseEpisodeInput(value, available);
    if (parsed.length === 0) {
      setError('No valid episodes in that range.');
      return;
    }
    setError(null);
    const eps = seasonInfo!.episodes.filter(ep => parsed.includes(ep.episode_number));
    setSelectedEpisodes(eps);
    setStep('resolution');
  }

  async function handleResolutionSelect(value: string) {
    if (value === '_back') {
      if (isMovie) setStep('action');
      else setStep('episodes');
      return;
    }
    const resolution = value === 'auto' ? null : value;
    let descriptors = isMovie ? buildDescriptors() : buildDescriptors(selectedEpisodes);

    if (action === 'undownloaded' && !isMovie) {
      setLoadingText('Checking for missing episodes...');
      setStep('loading');
      const { missing } = await checkExistingDownloads(descriptors, config.downloadPath);
      if (missing.length === 0) {
        setVerificationText('All selected episodes already downloaded!');
        setStep('verify');
        return;
      }
      descriptors = missing;
    }

    onDownload(descriptors, resolution);
  }

  return (
    <Box flexDirection="column">
      <Header breadcrumb={breadcrumb} />

      {error && (
        <Box paddingLeft={4} marginBottom={1}>
          <Text color={colors.error}>{`${symbols.cross}  ${error}`}</Text>
        </Box>
      )}

      <Box paddingLeft={4} marginBottom={1}>
        <Text>
          <Text color={colors.secondary} bold>{mediaInfo.title}</Text>
          <Text dimColor>{isMovie ? '  (Movie)' : `  (TV${seasonInfo ? ` - Season ${seasonInfo.seasonNumber}` : ''})`}</Text>
        </Text>
      </Box>

      {step === 'loading' && (
        <Box paddingLeft={4}>
          <Spinner label={loadingText} />
        </Box>
      )}

      {step === 'season' && <SeasonStep seasons={seasons} onSelect={handleSeasonSelect} />}
      {step === 'action' && <ActionStep isMovie={isMovie} onSelect={handleActionSelect} />}
      {step === 'episodes' && seasonInfo && (
        <EpisodesStep
          seasonNumber={seasonInfo.seasonNumber}
          episodes={seasonInfo.episodes}
          onSelect={handleEpisodeSelectionMode}
        />
      )}
      {step === 'episodeSelect' && seasonInfo && (
        <EpisodeSelectStep
          episodes={seasonInfo.episodes}
          onSubmit={handleEpisodeMultiSelectSubmit}
        />
      )}
      {step === 'episodeInput' && <EpisodeInputStep onSubmit={handleEpisodeInput} />}
      {step === 'resolution' && (
        <ResolutionStep
          isMovie={isMovie}
          episodeCount={selectedEpisodes.length}
          defaultResolution={config.preferredResolution}
          onSelect={handleResolutionSelect}
        />
      )}
      {step === 'verify' && <VerifyStep text={verificationText} onBack={onBack} />}

      <StatusBar />
    </Box>
  );
}
