import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { createSource } from '../../../source/index.js';
import { colors, symbols } from '../../theme.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { SourceStep } from './SourceStep.js';
import { ModeStep } from './ModeStep.js';
import { MediaTypeStep } from './MediaTypeStep.js';
import { QueryStep } from './QueryStep.js';
import { ResultsStep } from './ResultsStep.js';
export function SearchScreen({ config, onMediaSelected, onBack }) {
    const [step, setStep] = useState('source');
    const [sourceKey, setSourceKey] = useState(null);
    const [source, setSource] = useState(null);
    const [mode, setMode] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [statusText, setStatusText] = useState('');
    const breadcrumb = ['Home', 'Search'];
    if (sourceKey)
        breadcrumb.push(sourceKey);
    if (mode)
        breadcrumb.push(mode);
    if (mediaType)
        breadcrumb.push(mediaType);
    useInput((_input, key) => {
        if (!key.escape)
            return;
        setError(null);
        switch (step) {
            case 'source':
                onBack();
                break;
            case 'mode':
                setStep('source');
                setSourceKey(null);
                setSource(null);
                break;
            case 'mediaType':
                setStep('mode');
                setMode(null);
                break;
            case 'query':
                if (mode === 'url') {
                    setStep('source');
                    setSourceKey(null);
                    setSource(null);
                    setMode(null);
                }
                else {
                    setStep('mediaType');
                    setMediaType(null);
                }
                break;
            case 'results':
                setStep('query');
                break;
        }
    });
    function handleSourceSelect(value) {
        if (value === '_back') {
            onBack();
            return;
        }
        const key = value;
        setSourceKey(key);
        setSource(createSource(key));
        setStep('mode');
    }
    function handleModeSelect(value) {
        if (value === '_back') {
            setStep('source');
            setSourceKey(null);
            setSource(null);
            return;
        }
        setMode(value);
        if (value === 'url') {
            setStep('query');
        }
        else {
            setStep('mediaType');
        }
    }
    function handleMediaTypeSelect(value) {
        if (value === '_back') {
            setStep('mode');
            setMode(null);
            return;
        }
        setMediaType(value);
        setStep('query');
    }
    async function handleQuerySubmit(value) {
        if (!value.trim())
            return;
        setError(null);
        if (mode === 'url') {
            setStep('fetchingDetails');
            setStatusText('Fetching media info...');
            try {
                const info = await source.describeFromUrl(value.trim());
                if (info.type === 'movie') {
                    onMediaSelected({ type: 'movie', tmdbId: info.tmdbId, title: info.title, metadata: info.metadata }, source, config);
                }
                else {
                    onMediaSelected({
                        type: 'tv',
                        tmdbId: info.tmdbId,
                        title: info.title,
                        seasonNumber: info.season ?? info.seasonNumber,
                        episodes: info.episodes,
                        metadata: info.metadata,
                    }, source, config);
                }
            }
            catch (err) {
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
                    const details = await source.fetchMovieMetadata(value.trim());
                    onMediaSelected({ type: 'movie', tmdbId: value.trim(), title: details.title, metadata: details.metadata }, source, config);
                }
                else {
                    const show = await source.fetchShowDetails(value.trim());
                    onMediaSelected({
                        type: 'tv',
                        tmdbId: value.trim(),
                        title: show.name,
                        seasonNumber: -1,
                        episodes: [],
                        metadata: { ...show.metadata, _seasons: show.seasons },
                    }, source, config);
                }
            }
            catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                setStep('query');
            }
            return;
        }
        // Search by name
        setStep('searching');
        setStatusText(`Searching for "${value.trim()}"...`);
        try {
            const results = await source.searchByName(mediaType, value.trim());
            if (results.length === 0) {
                setError('No results found.');
                setStep('query');
                return;
            }
            setSearchResults(results);
            setStep('results');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStep('query');
        }
    }
    async function handleResultSelect(value) {
        if (value === '_back') {
            setStep('query');
            return;
        }
        const index = parseInt(value, 10);
        const selected = searchResults[index];
        if (!selected)
            return;
        setStep('fetchingDetails');
        setStatusText(`Loading ${selected.title}...`);
        try {
            if (mediaType === 'movie') {
                const details = await source.fetchMovieMetadata(selected.tmdbId);
                onMediaSelected({ type: 'movie', tmdbId: selected.tmdbId, title: details.title, metadata: details.metadata }, source, config);
            }
            else {
                const show = await source.fetchShowDetails(selected.tmdbId);
                onMediaSelected({
                    type: 'tv',
                    tmdbId: selected.tmdbId,
                    title: show.name,
                    seasonNumber: -1,
                    episodes: [],
                    metadata: { ...show.metadata, _seasons: show.seasons },
                }, source, config);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStep('results');
        }
    }
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: breadcrumb }), error && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.error, children: `${symbols.cross}  ${error}` }) })), step === 'source' && _jsx(SourceStep, { onSelect: handleSourceSelect }), step === 'mode' && sourceKey && _jsx(ModeStep, { sourceKey: sourceKey, onSelect: handleModeSelect }), step === 'mediaType' && _jsx(MediaTypeStep, { onSelect: handleMediaTypeSelect }), step === 'query' && mode && _jsx(QueryStep, { mode: mode, onSubmit: handleQuerySubmit }), (step === 'searching' || step === 'fetchingDetails') && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: statusText }) })), step === 'results' && _jsx(ResultsStep, { results: searchResults, onSelect: handleResultSelect }), _jsx(StatusBar, {})] }));
}
