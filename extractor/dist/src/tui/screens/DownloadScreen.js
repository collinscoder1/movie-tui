import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, Spinner } from '@inkjs/ui';
import { colors, symbols, horizontalLine } from '../theme.js';
import { Header } from '../components/Header.js';
import { StatusBar } from '../components/StatusBar.js';
import { fetchDownloadLinks, autoSelectQuality, queueDownload, queueSubtitle, fetchQueues, getDefaultQueueId, } from '../download-core.js';
export function DownloadScreen({ descriptors, resolution, source, config, onDone, onBack }) {
    const [step, setStep] = useState('confirm');
    const [items, setItems] = useState(() => descriptors.map(d => ({ descriptor: d, status: 'pending' })));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [queueId, setQueueId] = useState(null);
    const [summary, setSummary] = useState({ success: 0, fail: 0, skip: 0 });
    const [qualityPickEntries, setQualityPickEntries] = useState([]);
    const [qualityPickIndex, setQualityPickIndex] = useState(-1);
    const [qualityPickExtraction, setQualityPickExtraction] = useState(null);
    const prefs = {
        subtitleLanguage: config.subtitleLanguage ?? null,
        qualityPreference: {
            format: config.preferredFormat ?? 'any',
            resolution: resolution,
        },
    };
    // Escape goes back only on confirm step or when done
    useInput((_input, key) => {
        if (!key.escape)
            return;
        if (step === 'confirm')
            onBack();
        if (step === 'done')
            onDone();
    });
    const processItem = useCallback(async (index, qId) => {
        if (index >= items.length) {
            setStep('done');
            return;
        }
        const item = items[index];
        const descriptor = item.descriptor;
        setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'fetching', message: 'Fetching links...' } : it));
        const { result, error } = await fetchDownloadLinks(descriptor, source);
        if (error || !result) {
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'fail', message: error ?? 'Unknown error' } : it));
            setSummary(prev => ({ ...prev, fail: prev.fail + 1 }));
            setCurrentIndex(index + 1);
            return;
        }
        const { entry, allEntries, needsManualSelection } = autoSelectQuality(result, prefs.qualityPreference);
        if (needsManualSelection) {
            setQualityPickEntries(allEntries);
            setQualityPickIndex(index);
            setQualityPickExtraction(result);
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'selecting', message: 'Preferred quality unavailable', availableQualities: allEntries } : it));
            setStep('qualityPick');
            return;
        }
        if (!entry) {
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'skip', message: 'No suitable quality' } : it));
            setSummary(prev => ({ ...prev, skip: prev.skip + 1 }));
            setCurrentIndex(index + 1);
            return;
        }
        await doQueueDownload(index, entry, result, descriptor, qId);
    }, [items.length, source, prefs.qualityPreference]);
    async function doQueueDownload(index, entry, extraction, descriptor, qId) {
        setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'queuing', message: `Queuing ${entry.format} ${entry.resolution ?? 'auto'}...`, selectedEntry: entry } : it));
        const { success, error } = await queueDownload(entry, descriptor, qId, prefs, config.downloadPath);
        if (!success) {
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'fail', message: error ?? 'Queue failed' } : it));
            setSummary(prev => ({ ...prev, fail: prev.fail + 1 }));
        }
        else {
            let subQueued = false;
            if (prefs.subtitleLanguage && extraction) {
                subQueued = await queueSubtitle(extraction, descriptor, qId, prefs.subtitleLanguage, config.downloadPath);
            }
            const msg = `${entry.format} ${entry.resolution ?? 'auto'} (${entry.size})${subQueued ? ' + subtitle' : ''}`;
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'success', message: msg, selectedEntry: entry } : it));
            setSummary(prev => ({ ...prev, success: prev.success + 1 }));
        }
        setCurrentIndex(index + 1);
    }
    useEffect(() => {
        if (step === 'processing' && currentIndex < items.length) {
            processItem(currentIndex, queueId);
        }
        else if (step === 'processing' && currentIndex >= items.length) {
            setStep('done');
        }
    }, [currentIndex, step]);
    async function handleConfirm(value) {
        if (value === 'cancel') {
            onBack();
            return;
        }
        const queues = await fetchQueues();
        const qId = queues ? getDefaultQueueId(queues) : null;
        setQueueId(qId);
        setStep('processing');
        setCurrentIndex(0);
        processItem(0, qId);
    }
    async function handleQualityPick(value) {
        if (value === '_skip') {
            setItems(prev => prev.map((it, i) => i === qualityPickIndex ? { ...it, status: 'skip', message: 'Skipped by user' } : it));
            setSummary(prev => ({ ...prev, skip: prev.skip + 1 }));
            setStep('processing');
            setCurrentIndex(qualityPickIndex + 1);
            return;
        }
        const entryIndex = parseInt(value, 10);
        const entry = qualityPickEntries[entryIndex];
        if (!entry)
            return;
        setStep('processing');
        const descriptor = items[qualityPickIndex].descriptor;
        await doQueueDownload(qualityPickIndex, entry, qualityPickExtraction, descriptor, queueId);
    }
    function statusIcon(status) {
        switch (status) {
            case 'pending': return symbols.dot;
            case 'fetching': return symbols.ellipsis;
            case 'selecting': return '?';
            case 'queuing': return symbols.ellipsis;
            case 'success': return symbols.check;
            case 'fail': return symbols.cross;
            case 'skip': return symbols.pointerSmall;
        }
    }
    function statusColor(status) {
        switch (status) {
            case 'success': return colors.success;
            case 'fail': return colors.error;
            case 'skip': return colors.warning;
            case 'fetching':
            case 'queuing': return colors.primary;
            default: return undefined;
        }
    }
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: ['Home', 'Search', 'Download'] }), step === 'confirm' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Queue ${descriptors.length} item(s) for download?` }) }), _jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [descriptors.slice(0, 10).map((d, i) => (_jsx(Text, { dimColor: true, children: `    ${symbols.bullet}  ${d.description}` }, i))), descriptors.length > 10 && (_jsx(Text, { dimColor: true, children: `    ... and ${descriptors.length - 10} more` }))] }), _jsx(Select, { options: [
                            { label: `  ${symbols.check} Start downloading`, value: 'start' },
                            { label: `  ${symbols.cross} Cancel`, value: 'cancel' },
                        ], onChange: handleConfirm })] })), step === 'qualityPick' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Preferred quality not available for: ${items[qualityPickIndex]?.descriptor.description}` }) }), _jsx(Box, { marginBottom: 1, children: _jsx(Text, { children: 'Choose from available qualities:' }) }), _jsx(Select, { options: [
                            ...qualityPickEntries.map((e, i) => ({
                                label: `  ${e.format} ${e.resolution || 'unknown'} - ${e.size}`,
                                value: String(i),
                            })),
                            { label: '  Skip this item', value: '_skip' },
                        ], onChange: handleQualityPick })] })), (step === 'processing' || step === 'done') && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [step === 'processing' && (_jsx(Box, { marginBottom: 1, children: _jsx(Spinner, { label: `Processing ${currentIndex + 1}/${items.length}...` }) })), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: items.map((item, i) => (_jsxs(Box, { children: [_jsx(Text, { color: statusColor(item.status), children: `    ${statusIcon(item.status)}  ` }), _jsx(Text, { color: statusColor(item.status), children: item.descriptor.description }), item.message && (_jsx(Text, { dimColor: true, children: `  ${symbols.pointerSmall} ${item.message}` }))] }, i))) }), step === 'done' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { children: _jsxs(Text, { dimColor: true, children: ['  ', horizontalLine(50)] }) }), _jsxs(Box, { marginTop: 1, flexDirection: "column", paddingLeft: 2, children: [_jsx(Text, { bold: true, children: 'Summary' }), _jsx(Text, { children: " " }), _jsx(Text, { color: colors.success, children: `    ${symbols.check}  Queued:  ${summary.success}` }), _jsx(Text, { color: colors.error, children: `    ${symbols.cross}  Failed:  ${summary.fail}` }), _jsx(Text, { color: colors.warning, children: `    ${symbols.pointerSmall}  Skipped: ${summary.skip}` })] }), _jsx(Box, { marginTop: 1, children: _jsx(Select, { options: [
                                        { label: `  ${symbols.arrowRight} Back to main menu`, value: 'menu' },
                                    ], onChange: () => onDone() }) })] }))] })), _jsx(StatusBar, {})] }));
}
