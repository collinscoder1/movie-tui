import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
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
export function MediaScreen({ mediaInfo, source, config, onDownload, onBack }) {
    const isMovie = mediaInfo.type === 'movie';
    const [step, setStep] = useState(!isMovie && mediaInfo.seasonNumber === -1 ? 'season' : 'action');
    const [seasonInfo, setSeasonInfo] = useState(!isMovie && mediaInfo.seasonNumber !== -1 ? mediaInfo : null);
    const [action, setAction] = useState(null);
    const [selectedEpisodes, setSelectedEpisodes] = useState([]);
    const [verificationText, setVerificationText] = useState('');
    const [error, setError] = useState(null);
    const [loadingText, setLoadingText] = useState('');
    const seasons = !isMovie ? mediaInfo.metadata?._seasons ?? [] : [];
    const breadcrumb = ['Home', 'Search', mediaInfo.title];
    if (seasonInfo)
        breadcrumb.push(`S${seasonInfo.seasonNumber}`);
    useInput((_input, key) => {
        if (!key.escape)
            return;
        setError(null);
        switch (step) {
            case 'season':
                onBack();
                break;
            case 'action':
                if (!isMovie && seasons.length > 0) {
                    setStep('season');
                    setSeasonInfo(null);
                }
                else {
                    onBack();
                }
                break;
            case 'episodes':
                setStep('action');
                setAction(null);
                break;
            case 'episodeSelect':
                setStep('episodes');
                break;
            case 'episodeInput':
                setStep('episodes');
                break;
            case 'resolution':
                if (isMovie)
                    setStep('action');
                else
                    setStep('episodes');
                break;
            case 'verify':
                setStep('action');
                setAction(null);
                break;
        }
    });
    async function handleSeasonSelect(value) {
        if (value === '_back') {
            onBack();
            return;
        }
        const seasonNum = parseInt(value, 10);
        setStep('loading');
        setLoadingText(`Loading Season ${seasonNum}...`);
        try {
            const episodes = await source.fetchSeasonEpisodes(mediaInfo.tmdbId, seasonNum);
            const info = {
                type: 'tv',
                tmdbId: mediaInfo.tmdbId,
                title: mediaInfo.title,
                seasonNumber: seasonNum,
                episodes: episodes.map(ep => ({ episode_number: ep.episode_number, name: ep.name, metadata: ep.metadata })),
                metadata: mediaInfo.metadata,
            };
            setSeasonInfo(info);
            setStep('action');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStep('season');
        }
    }
    function buildDescriptors(episodes) {
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
        const eps = episodes ?? seasonInfo.episodes;
        return eps.map(ep => ({
            type: 'tv',
            tmdbId: mediaInfo.tmdbId,
            season: seasonInfo.seasonNumber,
            episode: ep.episode_number,
            description: `${mediaInfo.title} S${seasonInfo.seasonNumber}E${ep.episode_number}`,
            title: mediaInfo.title,
            metadata: mediaInfo.metadata,
        }));
    }
    async function handleActionSelect(value) {
        if (value === '_back') {
            if (!isMovie && seasons.length > 0) {
                setStep('season');
                setSeasonInfo(null);
            }
            else {
                onBack();
            }
            return;
        }
        const act = value;
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
    function handleEpisodeSelectionMode(value) {
        if (value === '_back') {
            setStep('action');
            setAction(null);
            return;
        }
        if (value === 'all') {
            setSelectedEpisodes(seasonInfo.episodes);
            setStep('resolution');
        }
        else if (value === 'select') {
            setStep('episodeSelect');
        }
        else if (value === 'custom') {
            setStep('episodeInput');
        }
    }
    function handleEpisodeMultiSelectSubmit(values) {
        if (values.length === 0) {
            setError('No episodes selected.');
            return;
        }
        setError(null);
        const episodeNumbers = values.map(v => parseInt(v, 10));
        const eps = seasonInfo.episodes.filter(ep => episodeNumbers.includes(ep.episode_number));
        setSelectedEpisodes(eps);
        setStep('resolution');
    }
    function handleEpisodeInput(value) {
        if (!value.trim())
            return;
        const available = seasonInfo.episodes.map(ep => ep.episode_number);
        const parsed = parseEpisodeInput(value, available);
        if (parsed.length === 0) {
            setError('No valid episodes in that range.');
            return;
        }
        setError(null);
        const eps = seasonInfo.episodes.filter(ep => parsed.includes(ep.episode_number));
        setSelectedEpisodes(eps);
        setStep('resolution');
    }
    async function handleResolutionSelect(value) {
        if (value === '_back') {
            if (isMovie)
                setStep('action');
            else
                setStep('episodes');
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
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: breadcrumb }), error && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.error, children: `${symbols.cross}  ${error}` }) })), _jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: colors.secondary, bold: true, children: mediaInfo.title }), _jsx(Text, { dimColor: true, children: isMovie ? '  (Movie)' : `  (TV${seasonInfo ? ` - Season ${seasonInfo.seasonNumber}` : ''})` })] }) }), step === 'loading' && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: loadingText }) })), step === 'season' && _jsx(SeasonStep, { seasons: seasons, onSelect: handleSeasonSelect }), step === 'action' && _jsx(ActionStep, { isMovie: isMovie, onSelect: handleActionSelect }), step === 'episodes' && seasonInfo && (_jsx(EpisodesStep, { seasonNumber: seasonInfo.seasonNumber, episodes: seasonInfo.episodes, onSelect: handleEpisodeSelectionMode })), step === 'episodeSelect' && seasonInfo && (_jsx(EpisodeSelectStep, { episodes: seasonInfo.episodes, onSubmit: handleEpisodeMultiSelectSubmit })), step === 'episodeInput' && _jsx(EpisodeInputStep, { onSubmit: handleEpisodeInput }), step === 'resolution' && (_jsx(ResolutionStep, { isMovie: isMovie, episodeCount: selectedEpisodes.length, defaultResolution: config.preferredResolution, onSelect: handleResolutionSelect })), step === 'verify' && _jsx(VerifyStep, { text: verificationText, onBack: onBack }), _jsx(StatusBar, {})] }));
}
