import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Box, useInput } from 'ink';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { useDownloadStore } from '../../stores/downloadStore.js';
import { ConfirmStep } from './ConfirmStep.js';
import { QualityPickStep } from './QualityPickStep.js';
import { ProgressList } from './ProgressList.js';
import { SummaryStep } from './SummaryStep.js';
export function DownloadScreen({ descriptors, resolution, source, config, onDone, onBack }) {
    const { step, items, summary, qualityPickIndex, qualityPickEntries, init, confirm, pickQuality, reset } = useDownloadStore();
    const prefs = {
        subtitleLanguage: config.subtitleLanguage ?? null,
        qualityPreference: {
            format: config.preferredFormat ?? 'any',
            resolution: resolution,
        },
    };
    useEffect(() => {
        init(descriptors, source, prefs, config.downloadPath);
        return () => reset();
    }, []);
    useInput((_input, key) => {
        if (!key.escape)
            return;
        if (step === 'confirm')
            onBack();
        if (step === 'done')
            onDone();
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: ['Home', 'Search', 'Download'] }), step === 'confirm' && (_jsx(ConfirmStep, { descriptors: descriptors, onConfirm: (value) => {
                    if (value === 'cancel')
                        onBack();
                    else
                        confirm();
                } })), step === 'qualityPick' && (_jsx(QualityPickStep, { description: items[qualityPickIndex]?.descriptor.description ?? '', entries: qualityPickEntries, onSelect: (value) => {
                    if (value === '_skip') {
                        pickQuality('_skip');
                    }
                    else {
                        pickQuality(parseInt(value, 10));
                    }
                } })), (step === 'processing' || step === 'done') && (_jsxs(Box, { flexDirection: "column", children: [_jsx(ProgressList, { items: items, isProcessing: step === 'processing' }), step === 'done' && (_jsx(SummaryStep, { success: summary.success, fail: summary.fail, skip: summary.skip, onDone: onDone }))] })), _jsx(StatusBar, {})] }));
}
