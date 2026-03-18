import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { listConfigs, loadConfig, saveConfig, deleteConfig, setDefaultConfig, loadDefaultConfig, } from '../../../config.js';
import { colors, symbols } from '../../theme.js';
import { Header } from '../../components/Header.js';
import { StatusBar } from '../../components/StatusBar.js';
import { ConfigMenu } from './ConfigMenu.js';
import { NameStep } from './NameStep.js';
import { SubtitleStep } from './SubtitleStep.js';
import { FormatStep } from './FormatStep.js';
import { ConfigResolutionStep } from './ConfigResolutionStep.js';
import { PathStep } from './PathStep.js';
import { SelectConfigStep } from './SelectConfigStep.js';
import { DeleteConfirmStep } from './DeleteConfirmStep.js';
export function ConfigScreen({ onBack }) {
    const [step, setStep] = useState('loading');
    const [configs, setConfigs] = useState([]);
    const [defaultName, setDefaultName] = useState(null);
    const [draft, setDraft] = useState({});
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    async function refreshConfigs() {
        setStep('loading');
        const names = await listConfigs();
        const def = await loadDefaultConfig();
        setConfigs(names);
        setDefaultName(def?.name ?? null);
        setStep('menu');
    }
    useEffect(() => { refreshConfigs(); }, []);
    useInput((_input, key) => {
        if (!key.escape)
            return;
        setError(null);
        switch (step) {
            case 'menu':
                onBack();
                break;
            case 'create_name':
                setStep('menu');
                break;
            case 'create_customName':
                setStep('create_name');
                break;
            case 'create_subtitle':
                if (editTarget) {
                    setEditTarget(null);
                    setStep('menu');
                }
                else
                    setStep('create_name');
                break;
            case 'create_format':
                setStep('create_subtitle');
                break;
            case 'create_resolution':
                setStep('create_format');
                break;
            case 'create_path':
                setStep('create_resolution');
                break;
            case 'create_pathInput':
                setStep('create_path');
                break;
            case 'edit_select':
                setStep('menu');
                break;
            case 'delete_select':
                setStep('menu');
                break;
            case 'delete_confirm':
                setDeleteTarget(null);
                setStep('menu');
                break;
            case 'setDefault_select':
                setStep('menu');
                break;
        }
    });
    function handleMenuSelect(value) {
        setMessage(null);
        setError(null);
        switch (value) {
            case 'create':
                setDraft({});
                setStep('create_name');
                break;
            case 'edit':
                setStep('edit_select');
                break;
            case 'delete':
                setStep('delete_select');
                break;
            case 'setDefault':
                setStep('setDefault_select');
                break;
            case 'back':
                onBack();
                break;
        }
    }
    // --- Create flow ---
    function handleNameSelect(value) {
        if (value === '_back') {
            setStep('menu');
            return;
        }
        if (value === 'custom') {
            setStep('create_customName');
            return;
        }
        setDraft(prev => ({ ...prev, name: value }));
        setStep('create_subtitle');
    }
    function handleCustomName(value) {
        if (!value.trim())
            return;
        const name = value.trim().replace(/\s+/g, '-').toLowerCase();
        setDraft(prev => ({ ...prev, name }));
        setStep('create_subtitle');
    }
    function handleSubtitleSelect(value) {
        if (value === '_back') {
            if (editTarget) {
                setEditTarget(null);
                setStep('menu');
            }
            else
                setStep('create_name');
            return;
        }
        setDraft(prev => ({ ...prev, subtitleLanguage: value === 'none' ? null : value }));
        setStep('create_format');
    }
    function handleFormatSelect(value) {
        if (value === '_back') {
            setStep('create_subtitle');
            return;
        }
        setDraft(prev => ({ ...prev, preferredFormat: value }));
        setStep('create_resolution');
    }
    function handleResolutionSelect(value) {
        if (value === '_back') {
            setStep('create_format');
            return;
        }
        setDraft(prev => ({ ...prev, preferredResolution: value }));
        setStep('create_path');
    }
    function handlePathSelect(value) {
        if (value === '_back') {
            setStep('create_resolution');
            return;
        }
        if (value === 'custom') {
            setStep('create_pathInput');
        }
        else {
            finalizeSave();
        }
    }
    function handlePathInput(value) {
        if (!value.trim())
            return;
        setDraft(prev => ({ ...prev, downloadPath: value.trim().replace(/\/$/, '') }));
        finalizeSave();
    }
    async function finalizeSave() {
        setStep('saving');
        const name = editTarget ?? draft.name;
        const configData = {
            subtitleLanguage: draft.subtitleLanguage ?? null,
            preferredFormat: draft.preferredFormat ?? 'any',
            preferredResolution: draft.preferredResolution ?? 'auto',
            downloadPath: draft.downloadPath,
        };
        try {
            await saveConfig(name, configData);
            const allConfigs = await listConfigs();
            if (allConfigs.length === 1) {
                await setDefaultConfig(name);
            }
            setMessage(`Configuration "${name}" saved.`);
            setEditTarget(null);
            await refreshConfigs();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStep('menu');
        }
    }
    // --- Edit flow ---
    async function handleEditSelect(value) {
        if (value === '_back') {
            setStep('menu');
            return;
        }
        setEditTarget(value);
        const existing = await loadConfig(value);
        if (existing) {
            setDraft({
                name: existing.name,
                subtitleLanguage: existing.subtitleLanguage,
                preferredFormat: existing.preferredFormat,
                preferredResolution: existing.preferredResolution,
                downloadPath: existing.downloadPath,
            });
        }
        setStep('create_subtitle');
    }
    // --- Delete flow ---
    function handleDeleteSelect(value) {
        if (value === '_back') {
            setStep('menu');
            return;
        }
        setDeleteTarget(value);
        setStep('delete_confirm');
    }
    async function handleDeleteConfirm(value) {
        if (value === 'yes' && deleteTarget) {
            await deleteConfig(deleteTarget);
            setMessage(`Configuration "${deleteTarget}" deleted.`);
            setDeleteTarget(null);
            await refreshConfigs();
        }
        else {
            setDeleteTarget(null);
            setStep('menu');
        }
    }
    // --- Set default flow ---
    async function handleSetDefaultSelect(value) {
        if (value === '_back') {
            setStep('menu');
            return;
        }
        await setDefaultConfig(value);
        setMessage(`"${value}" is now the default.`);
        await refreshConfigs();
    }
    const breadcrumb = ['Home', 'Config'];
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: breadcrumb }), message && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.success, children: `${symbols.check}  ${message}` }) })), error && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.error, children: `${symbols.cross}  ${error}` }) })), step === 'loading' && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: "Loading configurations..." }) })), step === 'saving' && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: "Saving..." }) })), step === 'menu' && (_jsx(ConfigMenu, { configs: configs, defaultName: defaultName, onSelect: handleMenuSelect })), step === 'create_name' && (_jsx(NameStep, { isCustom: false, onSelect: handleNameSelect, onCustomSubmit: handleCustomName })), step === 'create_customName' && (_jsx(NameStep, { isCustom: true, onSelect: handleNameSelect, onCustomSubmit: handleCustomName })), step === 'create_subtitle' && (_jsx(SubtitleStep, { configName: draft.name ?? editTarget ?? '', onSelect: handleSubtitleSelect })), step === 'create_format' && (_jsx(FormatStep, { onSelect: handleFormatSelect })), step === 'create_resolution' && (_jsx(ConfigResolutionStep, { onSelect: handleResolutionSelect })), step === 'create_path' && (_jsx(PathStep, { isInput: false, onSelect: handlePathSelect, onInputSubmit: handlePathInput })), step === 'create_pathInput' && (_jsx(PathStep, { isInput: true, onSelect: handlePathSelect, onInputSubmit: handlePathInput })), step === 'edit_select' && (_jsx(SelectConfigStep, { title: "Select configuration to edit:", configs: configs, onSelect: handleEditSelect })), step === 'delete_select' && (_jsx(SelectConfigStep, { title: "Select configuration to delete:", configs: configs, onSelect: handleDeleteSelect })), step === 'delete_confirm' && deleteTarget && (_jsx(DeleteConfirmStep, { name: deleteTarget, onConfirm: handleDeleteConfirm })), step === 'setDefault_select' && (_jsx(SelectConfigStep, { title: "Select default configuration:", configs: configs, defaultName: defaultName, showStar: true, onSelect: handleSetDefaultSelect })), _jsx(StatusBar, {})] }));
}
