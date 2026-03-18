import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, useInput } from 'ink';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { fetchDownloadLinks, autoSelectQuality, queueDownload, queueSubtitle, fetchQueues, getDefaultQueueId, } from '../../download-core.js';
import { ConfirmStep } from './ConfirmStep.js';
import { QualityPickStep } from './QualityPickStep.js';
import { ProgressList } from './ProgressList.js';
import { SummaryStep } from './SummaryStep.js';
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
        if (step !== 'processing')
            return;
        if (currentIndex < items.length) {
            processItem(currentIndex, queueId);
        }
        else {
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
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: ['Home', 'Search', 'Download'] }), step === 'confirm' && (_jsx(ConfirmStep, { descriptors: descriptors, onConfirm: handleConfirm })), step === 'qualityPick' && (_jsx(QualityPickStep, { description: items[qualityPickIndex]?.descriptor.description ?? '', entries: qualityPickEntries, onSelect: handleQualityPick })), (step === 'processing' || step === 'done') && (_jsxs(Box, { flexDirection: "column", children: [_jsx(ProgressList, { items: items, currentIndex: currentIndex, totalCount: items.length, isProcessing: step === 'processing' }), step === 'done' && (_jsx(SummaryStep, { success: summary.success, fail: summary.fail, skip: summary.skip, onDone: onDone }))] })), _jsx(StatusBar, {})] }));
}
