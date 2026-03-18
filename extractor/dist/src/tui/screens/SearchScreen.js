import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, TextInput, Spinner } from '@inkjs/ui';
import { createSource } from '../../source/index.js';
import { colors, symbols } from '../theme.js';
import { Header } from '../components/Header.js';
import { StatusBar } from '../components/StatusBar.js';
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
    // Escape key goes back one step
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
    const unsupportedModes = {
        moviebox: ['url'],
        wco: ['tmdb'],
    };
    const modeOptions = [
        { label: '  Provide a URL', value: 'url' },
        { label: '  Lookup by TMDb ID', value: 'tmdb' },
        { label: '  Search by name', value: 'name' },
    ].filter(opt => !(unsupportedModes[sourceKey] ?? []).includes(opt.value));
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: breadcrumb }), error && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.error, children: `${symbols.cross}  ${error}` }) })), step === 'source' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select content source:' }) }), _jsx(Select, { options: [
                            { label: '  VidSrc (vidsrc.vip)', value: 'vidsrc' },
                            { label: '  Moviebox', value: 'moviebox' },
                            { label: '  WCO (wcoflix.tv)', value: 'wco' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleSourceSelect })] })), step === 'mode' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'How to find media:' }) }), _jsx(Select, { options: [
                            ...modeOptions,
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleModeSelect })] })), step === 'mediaType' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Media type:' }) }), _jsx(Select, { options: [
                            { label: '  Movie', value: 'movie' },
                            { label: '  TV Show', value: 'tv' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleMediaTypeSelect })] })), step === 'query' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: mode === 'url' ? 'Enter URL:' : mode === 'tmdb' ? 'Enter TMDb ID:' : 'Enter search query:' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: mode === 'url' ? 'https://dl.vidsrc.vip/...' : mode === 'tmdb' ? '12345' : 'movie or show name', onSubmit: handleQuerySubmit })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] })), (step === 'searching' || step === 'fetchingDetails') && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: statusText }) })), step === 'results' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Found ${searchResults.length} results:` }) }), _jsx(Select, { options: [
                            ...searchResults.map((r, i) => ({
                                label: `  ${r.title} (${r.year})`,
                                value: String(i),
                            })),
                            { label: `  ${symbols.arrowRight} Back to search`, value: '_back' },
                        ], onChange: handleResultSelect })] })), _jsx(StatusBar, {})] }));
}
