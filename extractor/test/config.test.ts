import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set test config directory before importing config module
const TEST_CONFIG_DIR = join(homedir(), '.config', 'movie-download-cli-test');
process.env.MOVIE_DOWNLOAD_CLI_CONFIG = TEST_CONFIG_DIR;

// Now import the config module
const configModule = await import('../src/config.js');
const { listConfigs, loadConfig, saveConfig, deleteConfig, setDefaultConfig, loadDefaultConfig, configExists } = configModule;

async function setupTestDir(): Promise<void> {
  try {
    await rm(TEST_CONFIG_DIR, { recursive: true });
  } catch {
    // Ignore if doesn't exist
  }
}

test('config lifecycle', async () => {
  await setupTestDir();

  // Initially no configs
  console.log('Testing initial state');
  const initialConfigs = await listConfigs();
  assert.deepStrictEqual(initialConfigs, []);

  // Save a config
  console.log('Saving test config');
  const testConfig = {
    subtitleLanguage: 'English' as const,
    preferredFormat: 'MP4' as const,
    preferredResolution: '720' as const
  };
  await saveConfig('test-config', testConfig);

  // List should now include it
  console.log('Listing configs');
  const configsAfterSave = await listConfigs();
  assert.deepStrictEqual(configsAfterSave, ['test-config']);

  // Load the config
  console.log('Loading config');
  const loaded = await loadConfig('test-config');
  assert.ok(loaded);
  assert.strictEqual(loaded?.name, 'test-config');
  assert.strictEqual(loaded?.subtitleLanguage, 'English');
  assert.strictEqual(loaded?.preferredFormat, 'MP4');
  assert.strictEqual(loaded?.preferredResolution, '720');

  // Check exists
  console.log('Checking config exists');
  const exists = await configExists('test-config');
  assert.strictEqual(exists, true);

  // Delete it
  console.log('Deleting config');
  await deleteConfig('test-config');
  const existsAfterDelete = await configExists('test-config');
  assert.strictEqual(existsAfterDelete, false);

  // Cleanup
  await rm(TEST_CONFIG_DIR, { recursive: true });
});

test('default config handling', async () => {
  await setupTestDir();

  // No default initially
  console.log('Testing no default initially');
  const noDefault = await loadDefaultConfig();
  // Should return null since no configs exist
  assert.strictEqual(noDefault, null);

  // Create configs
  console.log('Creating multiple configs');
  await saveConfig('high-quality', {
    subtitleLanguage: 'English',
    preferredFormat: 'MP4',
    preferredResolution: '1080'
  });
  await saveConfig('mobile', {
    subtitleLanguage: null,
    preferredFormat: 'MP4',
    preferredResolution: '480'
  });

  // List should show both
  console.log('Listing configs');
  const configs = await listConfigs();
  assert.strictEqual(configs.length, 2);
  assert.ok(configs.includes('high-quality'));
  assert.ok(configs.includes('mobile'));

  // Set default
  console.log('Setting default config');
  await setDefaultConfig('high-quality');

  // Load default
  console.log('Loading default config');
  const defaultConfig = await loadDefaultConfig();
  assert.ok(defaultConfig);
  assert.strictEqual(defaultConfig?.name, 'high-quality');
  assert.strictEqual(defaultConfig?.preferredResolution, '1080');

  // Change default
  console.log('Changing default config');
  await setDefaultConfig('mobile');
  const newDefault = await loadDefaultConfig();
  assert.ok(newDefault);
  assert.strictEqual(newDefault?.name, 'mobile');
  assert.strictEqual(newDefault?.preferredResolution, '480');

  // Cleanup
  await rm(TEST_CONFIG_DIR, { recursive: true });
});

test('config with null values', async () => {
  await setupTestDir();

  console.log('Testing config with null subtitleLanguage');
  const config = {
    subtitleLanguage: null as string | null,
    preferredFormat: 'any' as const,
    preferredResolution: 'auto' as const
  };
  await saveConfig('no-subs', config);

  const loaded = await loadConfig('no-subs');
  assert.ok(loaded);
  assert.strictEqual(loaded?.subtitleLanguage, null);
  assert.strictEqual(loaded?.preferredFormat, 'any');
  assert.strictEqual(loaded?.preferredResolution, 'auto');

  // Cleanup
  await rm(TEST_CONFIG_DIR, { recursive: true });
});

test('load non-existent config returns null', async () => {
  // Ensure test dir exists but is empty
  await mkdir(TEST_CONFIG_DIR, { recursive: true });
  await mkdir(join(TEST_CONFIG_DIR, 'configs'), { recursive: true });

  console.log('Testing load non-existent config');
  const loaded = await loadConfig('does-not-exist');
  assert.strictEqual(loaded, null);

  // Cleanup
  await rm(TEST_CONFIG_DIR, { recursive: true });
});

test('delete non-existent config does not throw', async () => {
  // Ensure test dir exists but is empty
  await mkdir(TEST_CONFIG_DIR, { recursive: true });
  await mkdir(join(TEST_CONFIG_DIR, 'configs'), { recursive: true });

  console.log('Testing delete non-existent config');
  await assert.doesNotReject(async () => {
    await deleteConfig('does-not-exist');
  });

  // Cleanup
  await rm(TEST_CONFIG_DIR, { recursive: true });
});
