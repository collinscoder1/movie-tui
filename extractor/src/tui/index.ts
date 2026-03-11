import { intro, outro, isCancel, select, confirm } from '@clack/prompts';
import { EpisodeDescriptor } from '../search.js';
import { selectQueue, selectSubtitleLanguage, selectQualityPreference } from './prompts.js';
import { buildDescriptors } from './descriptors.js';
import { processDescriptor } from './downloads.js';
import { UserPreferences } from './types.js';
import { loadDefaultConfig, loadConfig, listConfigs, Config } from '../config.js';
import { runConfigTui } from './config-tui.js';

async function main(): Promise<void> {
  intro('vidsrc download manager TUI');
  try {
    const configCount = (await listConfigs()).length;

    const mode = await select({
      message: 'How would you like to locate the media?',
      options: [
        { value: 'url', label: 'Provide a vidSrc URL' },
        { value: 'tmdb', label: 'Lookup by TMDb ID' },
        { value: 'name', label: 'Search by name' },
        { value: 'config', label: `Manage configurations (${configCount} saved)` }
      ]
    });

    if (isCancel(mode)) {
      outro('Operation canceled.');
      return;
    }

    if (mode === 'config') {
      await runConfigTui();
      return;
    }

    const descriptors = await buildDescriptors(mode as 'url' | 'tmdb' | 'name');
    if (!descriptors.length) {
      outro('No episodes selected.');
      return;
    }

    const queueId = await selectQueue();

    // Config handling
    const { prefs, effectiveConfig } = await handleConfiguration();

    // Show what we're using
    if (effectiveConfig) {
      console.log(`\nUsing configuration: ${effectiveConfig.name}`);
      console.log(`  Subtitle: ${prefs.subtitleLanguage ?? 'none'}`);
      console.log(`  Format: ${prefs.qualityPreference.format}`);
      console.log(`  Resolution: ${prefs.qualityPreference.resolution ?? 'auto'}`);
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const descriptor of descriptors) {
      console.log(`\nProcessing ${descriptor.description} ...`);
      const result = await processDescriptor(descriptor, queueId, prefs);
      if (result === 'success') successCount++;
      else if (result === 'fail') failCount++;
      else skipCount++;
    }

    console.log(`\n=== Summary: ${successCount} queued, ${failCount} failed, ${skipCount} skipped ===`);
    outro('Download requests submitted.');
  } catch (error) {
    outro(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function handleConfiguration(): Promise<{ prefs: UserPreferences; effectiveConfig: Config | null }> {
  const configs = await listConfigs();
  const defaultConfig = await loadDefaultConfig();

  // No configs exist - prompt for preferences normally
  if (configs.length === 0) {
    console.log('\nNo saved configurations. Enter preferences:');
    const prefs = await collectPreferences();
    return { prefs, effectiveConfig: null };
  }

  // Ask user what to do
  const defaultLabel = defaultConfig
    ? `${defaultConfig.name} (${defaultConfig.preferredFormat}, ${defaultConfig.preferredResolution}p, ${defaultConfig.subtitleLanguage ?? 'no subs'})`
    : 'none';

  const choice = await select({
    message: `Default config: ${defaultLabel}`,
    options: [
      { value: 'use-default', label: 'Yes, use default configuration' },
      { value: 'select-other', label: 'Select different configuration' },
      { value: 'custom', label: 'No, customize for this run only' }
    ]
  });

  if (isCancel(choice)) {
    // Treat cancel as "use default" if exists, otherwise custom
    if (defaultConfig) {
      return { prefs: configToPrefs(defaultConfig), effectiveConfig: defaultConfig };
    }
    const prefs = await collectPreferences();
    return { prefs, effectiveConfig: null };
  }

  if (choice === 'use-default') {
    if (!defaultConfig) {
      console.log('No default configuration set. Enter preferences:');
      const prefs = await collectPreferences();
      return { prefs, effectiveConfig: null };
    }
    return { prefs: configToPrefs(defaultConfig), effectiveConfig: defaultConfig };
  }

  if (choice === 'select-other') {
    const configNames = await listConfigs();
    const options = configNames.map(name => {
      const isDefault = defaultConfig?.name === name;
      return { value: name, label: isDefault ? `${name} (default)` : name };
    });

    const selected = await select({ message: 'Select configuration:', options });
    if (isCancel(selected)) {
      const prefs = await collectPreferences();
      return { prefs, effectiveConfig: null };
    }

    const config = await loadConfig(selected as string);
    if (!config) {
      console.log('Configuration not found. Enter preferences:');
      const prefs = await collectPreferences();
      return { prefs, effectiveConfig: null };
    }

    // Ask if this should be the new default
    const setDefault = await confirm({ message: `Set "${config.name}" as default?` });
    if (setDefault && !isCancel(setDefault)) {
      const { setDefaultConfig } = await import('../config.js');
      await setDefaultConfig(config.name);
    }

    return { prefs: configToPrefs(config), effectiveConfig: config };
  }

  // custom - prompt for everything
  const prefs = await collectPreferences();
  return { prefs, effectiveConfig: null };
}

function configToPrefs(config: Config): UserPreferences {
  return {
    subtitleLanguage: config.subtitleLanguage,
    qualityPreference: {
      format: config.preferredFormat,
      resolution: config.preferredResolution === 'auto' ? null : config.preferredResolution
    }
  };
}

async function collectPreferences(): Promise<UserPreferences> {
  const subtitleLanguage = await selectSubtitleLanguage();
  const qualityPreference = await selectQualityPreference();

  return { subtitleLanguage, qualityPreference };
}

main();
