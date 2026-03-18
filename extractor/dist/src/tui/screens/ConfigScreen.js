import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, TextInput, Spinner } from '@inkjs/ui';
import { listConfigs, loadConfig, saveConfig, deleteConfig, setDefaultConfig, loadDefaultConfig, } from '../../config.js';
import { colors, symbols } from '../theme.js';
import { Header } from '../components/Header.js';
import { StatusBar } from '../components/StatusBar.js';
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
    // Escape key goes back one step
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
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, { breadcrumb: breadcrumb }), message && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.success, children: `${symbols.check}  ${message}` }) })), error && (_jsx(Box, { paddingLeft: 4, marginBottom: 1, children: _jsx(Text, { color: colors.error, children: `${symbols.cross}  ${error}` }) })), step === 'loading' && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: "Loading configurations..." }) })), step === 'saving' && (_jsx(Box, { paddingLeft: 4, children: _jsx(Spinner, { label: "Saving..." }) })), step === 'menu' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [configs.length > 0 ? (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { dimColor: true, children: `Default: ${defaultName ?? 'none'}  |  ${configs.length} config(s)` }), _jsx(Text, { children: " " }), configs.map(name => (_jsx(Text, { dimColor: true, children: `    ${name === defaultName ? symbols.star : symbols.bullet}  ${name}` }, name)))] })) : (_jsx(Box, { marginBottom: 1, children: _jsx(Text, { dimColor: true, children: 'No configurations saved.' }) })), _jsx(Select, { options: [
                            { label: '  Create new configuration', value: 'create' },
                            ...(configs.length > 0 ? [
                                { label: '  Edit configuration', value: 'edit' },
                                { label: '  Delete configuration', value: 'delete' },
                                { label: '  Set default configuration', value: 'setDefault' },
                            ] : []),
                            { label: `  ${symbols.arrowRight} Back to main menu`, value: 'back' },
                        ], onChange: handleMenuSelect })] })), step === 'create_name' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Choose a name:' }) }), _jsx(Select, { options: [
                            { label: '  default', value: 'default' },
                            { label: '  high-quality', value: 'high-quality' },
                            { label: '  mobile', value: 'mobile' },
                            { label: '  Custom name...', value: 'custom' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleNameSelect })] })), step === 'create_customName' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Enter configuration name:' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: "my-config", onSubmit: handleCustomName })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] })), step === 'create_subtitle' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: `Configure "${draft.name ?? editTarget}": Subtitle language` }) }), _jsx(Select, { options: [
                            { label: '  No subtitles', value: 'none' },
                            { label: '  English', value: 'English' },
                            { label: '  Spanish', value: 'Spanish' },
                            { label: '  Arabic', value: 'Arabic' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleSubtitleSelect })] })), step === 'create_format' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Preferred format:' }) }), _jsx(Select, { options: [
                            { label: '  MP4', value: 'MP4' },
                            { label: '  MKV', value: 'MKV' },
                            { label: '  Any format', value: 'any' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleFormatSelect })] })), step === 'create_resolution' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Preferred resolution:' }) }), _jsx(Select, { options: [
                            { label: '  1080p (Full HD)', value: '1080' },
                            { label: '  720p (HD)', value: '720' },
                            { label: '  480p (SD)', value: '480' },
                            { label: '  360p (Low)', value: '360' },
                            { label: '  Auto (best available)', value: 'auto' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleResolutionSelect })] })), step === 'create_path' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Download path:' }) }), _jsx(Select, { options: [
                            { label: '  Use AB Download Manager default', value: 'default' },
                            { label: '  Specify custom path', value: 'custom' },
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handlePathSelect })] })), step === 'create_pathInput' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Enter download base path:' }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.primary, children: `${symbols.pointer} ` }), _jsx(TextInput, { placeholder: "/home/user/Downloads", onSubmit: handlePathInput })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: 'Press Enter to submit, Esc to go back' }) })] })), step === 'edit_select' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select configuration to edit:' }) }), _jsx(Select, { options: [
                            ...configs.map(name => ({ label: `  ${name}`, value: name })),
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleEditSelect })] })), step === 'delete_select' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select configuration to delete:' }) }), _jsx(Select, { options: [
                            ...configs.map(name => ({ label: `  ${name}`, value: name })),
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleDeleteSelect })] })), step === 'delete_confirm' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, color: colors.warning, children: `Delete "${deleteTarget}"?` }) }), _jsx(Select, { options: [
                            { label: '  Yes, delete', value: 'yes' },
                            { label: '  No, cancel', value: 'no' },
                        ], onChange: handleDeleteConfirm })] })), step === 'setDefault_select' && (_jsxs(Box, { flexDirection: "column", paddingLeft: 4, children: [_jsx(Box, { marginBottom: 1, children: _jsx(Text, { bold: true, children: 'Select default configuration:' }) }), _jsx(Select, { options: [
                            ...configs.map(name => ({
                                label: `  ${name === defaultName ? `${symbols.star} ` : '  '}${name}`,
                                value: name,
                            })),
                            { label: `  ${symbols.arrowRight} Back`, value: '_back' },
                        ], onChange: handleSetDefaultSelect })] })), _jsx(StatusBar, {})] }));
}
