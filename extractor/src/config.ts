import { readFile, writeFile, mkdir, readdir, access, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

function getBaseDir(): string {
  if (process.env.MOVIE_DOWNLOAD_CLI_CONFIG) {
    return process.env.MOVIE_DOWNLOAD_CLI_CONFIG;
  }
  return join(homedir(), '.config', 'movie-download-cli');
}

function getConfigDir(): string {
  return join(getBaseDir(), 'configs');
}

function getDefaultFile(): string {
  return join(getBaseDir(), 'default');
}

export interface Config {
  name: string;
  subtitleLanguage: string | null;
  preferredFormat: string;
  preferredResolution: string;
  downloadPath?: string;
}

async function ensureConfigDir(): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true });
}

export async function listConfigs(): Promise<string[]> {
  try {
    await ensureConfigDir();
    const files = await readdir(getConfigDir());
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function loadConfig(name: string): Promise<Config | null> {
  try {
    const path = join(getConfigDir(), `${name}.json`);
    const data = await readFile(path, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...parsed, name };
  } catch {
    return null;
  }
}

export async function loadDefaultConfig(): Promise<Config | null> {
  try {
    const defaultName = await readFile(getDefaultFile(), 'utf-8');
    return await loadConfig(defaultName.trim());
  } catch {
    const configs = await listConfigs();
    if (configs.length > 0) {
      return await loadConfig(configs[0]);
    }
    return null;
  }
}

export async function validateDownloadPath(path: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if path exists
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path exists but is not a directory' };
    }
    return { valid: true };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Path doesn't exist, try to create it
      try {
        await mkdir(path, { recursive: true });
        return { valid: true };
      } catch (createError: any) {
        return { valid: false, error: `Failed to create directory: ${createError.message}` };
      }
    }
    return { valid: false, error: error.message };
  }
}

export async function saveConfig(name: string, config: Omit<Config, 'name'>): Promise<void> {
  await ensureConfigDir();

  // Validate download path if provided
  if (config.downloadPath) {
    const validation = await validateDownloadPath(config.downloadPath);
    if (!validation.valid) {
      throw new Error(`Invalid download path "${config.downloadPath}": ${validation.error}`);
    }
  }

  const path = join(getConfigDir(), `${name}.json`);
  await writeFile(path, JSON.stringify(config, null, 2));
}

export async function deleteConfig(name: string): Promise<void> {
  try {
    const path = join(getConfigDir(), `${name}.json`);
    await unlink(path);
  } catch {
    // Ignore errors
  }
}

export async function setDefaultConfig(name: string): Promise<void> {
  await ensureConfigDir();
  await writeFile(getDefaultFile(), name);
}

export async function configExists(name: string): Promise<boolean> {
  try {
    const path = join(getConfigDir(), `${name}.json`);
    await access(path);
    return true;
  } catch {
    return false;
  }
}
