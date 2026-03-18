import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import {
  listConfigs,
  loadConfig,
  saveConfig,
  deleteConfig,
  setDefaultConfig,
  loadDefaultConfig,
  Config,
} from '../../../config.js';
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

type ConfigStep = 'menu' | 'create_name' | 'create_customName' | 'create_subtitle' | 'create_format' | 'create_resolution' | 'create_path' | 'create_pathInput' | 'edit_select' | 'delete_select' | 'delete_confirm' | 'setDefault_select' | 'saving' | 'loading';

interface ConfigScreenProps {
  onBack: () => void;
}

interface ConfigDraft {
  name: string;
  subtitleLanguage: string | null;
  preferredFormat: string;
  preferredResolution: string;
  downloadPath?: string;
}

export function ConfigScreen({ onBack }: ConfigScreenProps) {
  const [step, setStep] = useState<ConfigStep>('loading');
  const [configs, setConfigs] = useState<string[]>([]);
  const [defaultName, setDefaultName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ConfigDraft>>({});
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!key.escape) return;
    setError(null);
    switch (step) {
      case 'menu': onBack(); break;
      case 'create_name': setStep('menu'); break;
      case 'create_customName': setStep('create_name'); break;
      case 'create_subtitle':
        if (editTarget) { setEditTarget(null); setStep('menu'); }
        else setStep('create_name');
        break;
      case 'create_format': setStep('create_subtitle'); break;
      case 'create_resolution': setStep('create_format'); break;
      case 'create_path': setStep('create_resolution'); break;
      case 'create_pathInput': setStep('create_path'); break;
      case 'edit_select': setStep('menu'); break;
      case 'delete_select': setStep('menu'); break;
      case 'delete_confirm': setDeleteTarget(null); setStep('menu'); break;
      case 'setDefault_select': setStep('menu'); break;
    }
  });

  function handleMenuSelect(value: string) {
    setMessage(null);
    setError(null);
    switch (value) {
      case 'create': setDraft({}); setStep('create_name'); break;
      case 'edit': setStep('edit_select'); break;
      case 'delete': setStep('delete_select'); break;
      case 'setDefault': setStep('setDefault_select'); break;
      case 'back': onBack(); break;
    }
  }

  // --- Create flow ---
  function handleNameSelect(value: string) {
    if (value === '_back') { setStep('menu'); return; }
    if (value === 'custom') { setStep('create_customName'); return; }
    setDraft(prev => ({ ...prev, name: value }));
    setStep('create_subtitle');
  }

  function handleCustomName(value: string) {
    if (!value.trim()) return;
    const name = value.trim().replace(/\s+/g, '-').toLowerCase();
    setDraft(prev => ({ ...prev, name }));
    setStep('create_subtitle');
  }

  function handleSubtitleSelect(value: string) {
    if (value === '_back') {
      if (editTarget) { setEditTarget(null); setStep('menu'); }
      else setStep('create_name');
      return;
    }
    setDraft(prev => ({ ...prev, subtitleLanguage: value === 'none' ? null : value }));
    setStep('create_format');
  }

  function handleFormatSelect(value: string) {
    if (value === '_back') { setStep('create_subtitle'); return; }
    setDraft(prev => ({ ...prev, preferredFormat: value }));
    setStep('create_resolution');
  }

  function handleResolutionSelect(value: string) {
    if (value === '_back') { setStep('create_format'); return; }
    setDraft(prev => ({ ...prev, preferredResolution: value }));
    setStep('create_path');
  }

  function handlePathSelect(value: string) {
    if (value === '_back') { setStep('create_resolution'); return; }
    if (value === 'custom') {
      setStep('create_pathInput');
    } else {
      finalizeSave();
    }
  }

  function handlePathInput(value: string) {
    if (!value.trim()) return;
    setDraft(prev => ({ ...prev, downloadPath: value.trim().replace(/\/$/, '') }));
    finalizeSave();
  }

  async function finalizeSave() {
    setStep('saving');
    const name = editTarget ?? draft.name!;
    const configData: Omit<Config, 'name'> = {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('menu');
    }
  }

  // --- Edit flow ---
  async function handleEditSelect(value: string) {
    if (value === '_back') { setStep('menu'); return; }
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
  function handleDeleteSelect(value: string) {
    if (value === '_back') { setStep('menu'); return; }
    setDeleteTarget(value);
    setStep('delete_confirm');
  }

  async function handleDeleteConfirm(value: string) {
    if (value === 'yes' && deleteTarget) {
      await deleteConfig(deleteTarget);
      setMessage(`Configuration "${deleteTarget}" deleted.`);
      setDeleteTarget(null);
      await refreshConfigs();
    } else {
      setDeleteTarget(null);
      setStep('menu');
    }
  }

  // --- Set default flow ---
  async function handleSetDefaultSelect(value: string) {
    if (value === '_back') { setStep('menu'); return; }
    await setDefaultConfig(value);
    setMessage(`"${value}" is now the default.`);
    await refreshConfigs();
  }

  const breadcrumb = ['Home', 'Config'];

  return (
    <Box flexDirection="column">
      <Header breadcrumb={breadcrumb} />

      {message && (
        <Box paddingLeft={4} marginBottom={1}>
          <Text color={colors.success}>{`${symbols.check}  ${message}`}</Text>
        </Box>
      )}
      {error && (
        <Box paddingLeft={4} marginBottom={1}>
          <Text color={colors.error}>{`${symbols.cross}  ${error}`}</Text>
        </Box>
      )}

      {step === 'loading' && (
        <Box paddingLeft={4}><Spinner label="Loading configurations..." /></Box>
      )}

      {step === 'saving' && (
        <Box paddingLeft={4}><Spinner label="Saving..." /></Box>
      )}

      {step === 'menu' && (
        <ConfigMenu configs={configs} defaultName={defaultName} onSelect={handleMenuSelect} />
      )}

      {step === 'create_name' && (
        <NameStep isCustom={false} onSelect={handleNameSelect} onCustomSubmit={handleCustomName} />
      )}

      {step === 'create_customName' && (
        <NameStep isCustom={true} onSelect={handleNameSelect} onCustomSubmit={handleCustomName} />
      )}

      {step === 'create_subtitle' && (
        <SubtitleStep configName={draft.name ?? editTarget ?? ''} onSelect={handleSubtitleSelect} />
      )}

      {step === 'create_format' && (
        <FormatStep onSelect={handleFormatSelect} />
      )}

      {step === 'create_resolution' && (
        <ConfigResolutionStep onSelect={handleResolutionSelect} />
      )}

      {step === 'create_path' && (
        <PathStep isInput={false} onSelect={handlePathSelect} onInputSubmit={handlePathInput} />
      )}

      {step === 'create_pathInput' && (
        <PathStep isInput={true} onSelect={handlePathSelect} onInputSubmit={handlePathInput} />
      )}

      {step === 'edit_select' && (
        <SelectConfigStep
          title="Select configuration to edit:"
          configs={configs}
          onSelect={handleEditSelect}
        />
      )}

      {step === 'delete_select' && (
        <SelectConfigStep
          title="Select configuration to delete:"
          configs={configs}
          onSelect={handleDeleteSelect}
        />
      )}

      {step === 'delete_confirm' && deleteTarget && (
        <DeleteConfirmStep name={deleteTarget} onConfirm={handleDeleteConfirm} />
      )}

      {step === 'setDefault_select' && (
        <SelectConfigStep
          title="Select default configuration:"
          configs={configs}
          defaultName={defaultName}
          showStar={true}
          onSelect={handleSetDefaultSelect}
        />
      )}

      <StatusBar />
    </Box>
  );
}
