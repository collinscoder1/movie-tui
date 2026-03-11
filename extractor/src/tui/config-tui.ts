import { intro, outro, select, confirm, isCancel } from '@clack/prompts';
import {
  listConfigs,
  loadConfig,
  saveConfig,
  deleteConfig,
  setDefaultConfig,
  loadDefaultConfig,
  configExists,
  Config
} from '../config.js';
import { selectSubtitleLanguage, selectQualityPreference } from './prompts.js';

export async function runConfigTui(): Promise<void> {
  intro('Configuration Manager');

  while (true) {
    const configs = await listConfigs();
    const defaultConfig = await loadDefaultConfig();

    const options: { value: string; label: string }[] = [
      { value: 'create', label: 'Create new configuration' }
    ];

    if (configs.length > 0) {
      options.push(
        { value: 'edit', label: 'Edit existing configuration' },
        { value: 'delete', label: 'Delete configuration' },
        { value: 'set-default', label: 'Set default configuration' }
      );
    }

    options.push({ value: 'back', label: 'Back to main menu' });

    const choice = await select({
      message: configs.length > 0
        ? `Current default: ${defaultConfig?.name ?? 'none'} (${configs.length} configs)`
        : 'No configurations saved',
      options
    });

    if (isCancel(choice) || choice === 'back') {
      outro('Configuration manager closed.');
      return;
    }

    switch (choice) {
      case 'create':
        await createConfig();
        break;
      case 'edit':
        await editConfig(configs);
        break;
      case 'delete':
        await deleteConfigPrompt(configs);
        break;
      case 'set-default':
        await setDefaultConfigPrompt(configs);
        break;
    }
  }
}

async function createConfig(): Promise<void> {
  const configs = await listConfigs();

  const nameChoice = await select({
    message: 'Choose a name for this configuration:',
    options: [
      { value: 'default', label: 'default' },
      { value: 'high-quality', label: 'high-quality' },
      { value: 'mobile', label: 'mobile' },
      { value: 'custom', label: 'Custom name...' }
    ]
  });

  if (isCancel(nameChoice)) return;

  let name: string;
  if (nameChoice === 'custom') {
    const { text } = await import('@clack/prompts');
    const customName = await text({ message: 'Enter configuration name:' });
    if (isCancel(customName) || !customName) return;
    name = String(customName).trim().replace(/\s+/g, '-').toLowerCase();
  } else {
    name = nameChoice as string;
  }

  if (await configExists(name)) {
    const overwrite = await confirm({
      message: `Configuration "${name}" already exists. Overwrite?`
    });
    if (!overwrite || isCancel(overwrite)) return;
  }

  console.log('\nConfigure settings for', name);

  const subtitleLanguage = await selectSubtitleLanguage();
  const qualityPreference = await selectQualityPreference();

  const config: Omit<Config, 'name'> = {
    subtitleLanguage,
    preferredFormat: qualityPreference.format,
    preferredResolution: qualityPreference.resolution ?? 'auto'
  };

  await saveConfig(name, config);

  const isFirstConfig = (await listConfigs()).length === 1;
  if (isFirstConfig) {
    await setDefaultConfig(name);
    console.log(`\nConfiguration "${name}" saved and set as default.`);
  } else {
    const setDefault = await confirm({
      message: `Set "${name}" as default configuration?`
    });
    if (setDefault && !isCancel(setDefault)) {
      await setDefaultConfig(name);
      console.log(`\nConfiguration "${name}" saved and set as default.`);
    } else {
      console.log(`\nConfiguration "${name}" saved.`);
    }
  }
}

async function editConfig(configNames: string[]): Promise<void> {
  const options = configNames.map(name => ({ value: name, label: name }));

  const choice = await select({
    message: 'Select configuration to edit:',
    options
  });

  if (isCancel(choice)) return;

  const existing = await loadConfig(choice as string);
  if (!existing) {
    console.log('Configuration not found.');
    return;
  }

  console.log(`\nEditing "${existing.name}"`);
  console.log('Current settings:', JSON.stringify(existing, null, 2));

  const subtitleLanguage = await selectSubtitleLanguage();
  const qualityPreference = await selectQualityPreference();

  const config: Omit<Config, 'name'> = {
    subtitleLanguage,
    preferredFormat: qualityPreference.format,
    preferredResolution: qualityPreference.resolution ?? 'auto'
  };

  await saveConfig(existing.name, config);
  console.log(`\nConfiguration "${existing.name}" updated.`);
}

async function deleteConfigPrompt(configNames: string[]): Promise<void> {
  const options = configNames.map(name => ({ value: name, label: name }));

  const choice = await select({
    message: 'Select configuration to delete:',
    options
  });

  if (isCancel(choice)) return;

  const confirmDelete = await confirm({
    message: `Are you sure you want to delete "${choice as string}"?`
  });

  if (confirmDelete && !isCancel(confirmDelete)) {
    await deleteConfig(choice as string);
    console.log(`Configuration "${choice as string}" deleted.`);
  }
}

async function setDefaultConfigPrompt(configNames: string[]): Promise<void> {
  const options = configNames.map(name => ({ value: name, label: name }));

  const choice = await select({
    message: 'Select default configuration:',
    options
  });

  if (isCancel(choice)) return;

  await setDefaultConfig(choice as string);
  console.log(`"${choice as string}" is now the default configuration.`);
}
