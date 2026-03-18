import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, MultiSelect, TextInput, Spinner } from '@inkjs/ui';
import { checkExistingDownloads, formatVerificationResults } from '../file-checker.js';
import { parseEpisodeInput } from '../../search.js';
import { colors, symbols } from '../theme.js';
import { Header } from '../components/Header.js';
import { StatusBar } from '../components/StatusBar.js';
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
    // Escape key goes back one step
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
        // TV: go to episode selection
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
    const defaultRes = config.preferredResolution;
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: breadcrumb }), error && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.error, children: `${symbols.cross}  ${error}` }) })), _jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsxs(Text, { children: [_jsx(Text, { color: colors.secondary, bold: true, children: mediaInfo.title }), _jsx(Text, { dimColor: true, children: isMovie ? '  (Movie)' : `  (TV${seasonInfo ? ` - Season ${seasonInfo.seasonNumber}` : ''})` })] }) }), step === 'loading' && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: loadingText }) })), step === 'season' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select season:' }) }), _jsx(Select, { options: [
                            ...seasons
                                .filter(s => s.season_number > 0)
                                .map(s => ({
                                label: `  Season ${s.season_number}  (${s.episode_count ?? '?'} episodes)`,
                                value: String(s.season_number),
                            })),
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleSeasonSelect })] })), step === 'action' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'What would you like to do?' }) }), _jsx(Select, { options: [
                            { label: isMovie ? '  Download movie' : '  Download episodes', value: 'download' },
                            { label: '  Verify existing downloads', value: 'verify' },
                            { label: isMovie ? '  Download if missing' : '  Download missing only', value: 'undownloaded' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleActionSelect })] })), step === 'episodes' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Season ${seasonInfo.seasonNumber} - ${seasonInfo.episodes.length} episodes:` }) }), _jsx(Select, { options: [
                            { label: '  Select all episodes', value: 'all' },
                            { label: '  Pick specific episodes (space to toggle)', value: 'select' },
                            { label: '  Enter episode range (e.g., 1-3,5)', value: 'custom' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleEpisodeSelectionMode }), _jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: 'Available episodes:' }), _jsx(Box, { flexWrap: "wrap", width: 60, marginTop: 1, children: seasonInfo.episodes.map(ep => (_jsx(Box, { width: 14, children: _jsx(Text, { dimColor: true, children: `  E${String(ep.episode_number).padStart(2, '0')} ` }) }, ep.episode_number))) })] })] })), step === 'episodeSelect' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select episodes (space to toggle, enter to confirm):' }) }), _jsx(MultiSelect, { options: seasonInfo.episodes.map(ep => {
                            const title = ep.name;
                            const label = title
                                ? `  E${String(ep.episode_number).padStart(2, '0')} - ${title}`
                                : `  E${String(ep.episode_number).padStart(2, '0')}`;
                            return { label, value: String(ep.episode_number) };
                        }), onSubmit: handleEpisodeMultiSelectSubmit }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Space to toggle, Enter to confirm, Esc to go back' }) })] })), step === 'episodeInput' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Enter episode range (e.g., 1-3,5,7-10):' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: "1-3,5", onSubmit: handleEpisodeInput })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] })), step === 'resolution' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: isMovie
                                ? 'Select resolution:'
                                : `Select resolution for ${selectedEpisodes.length} episode(s):` }) }), _jsx(Select, { options: (() => {
                            const resolutions = [
                                { label: '1080p (Full HD)', value: '1080' },
                                { label: '720p (HD)', value: '720' },
                                { label: '480p (SD)', value: '480' },
                                { label: '360p (Low)', value: '360' },
                            ].map(r => ({
                                label: r.value === defaultRes ? `  ${r.label} [default]` : `  ${r.label}`,
                                value: r.value,
                            }));
                            // Move config default to the top
                            if (defaultRes && resolutions.some(r => r.value === defaultRes)) {
                                const idx = resolutions.findIndex(r => r.value === defaultRes);
                                const [item] = resolutions.splice(idx, 1);
                                resolutions.unshift(item);
                            }
                            return [
                                ...resolutions,
                                { label: '  Auto (best available)', value: 'auto' },
                                { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                            ];
                        })(), onChange: handleResolutionSelect })] })), step === 'verify' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, flexDirection: "column", children: verificationText.split('\n').map((line, i) => {
                            const isCheck = line.includes(symbols.check);
                            const isCross = line.includes(symbols.cross);
                            return (_jsxs(Text, { color: isCheck ? colors.success : isCross ? colors.error : undefined, children: ['  ', line] }, i));
                        }) }), _jsx(Select, { options: [
                            { label: `  ${symbols.arrowRight} Back to menu`, value: '_back' },
                        ], onChange: () => onBack() })] })), _jsx(StatusBar, {})] }));
}
