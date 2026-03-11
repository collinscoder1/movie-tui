import { readFile, writeFile, mkdir, readdir, access, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
function getBaseDir() {
    if (process.env.MOVIE_DOWNLOAD_CLI_CONFIG) {
        return process.env.MOVIE_DOWNLOAD_CLI_CONFIG;
    }
    return join(homedir(), '.config', 'movie-download-cli');
}
function getConfigDir() {
    return join(getBaseDir(), 'configs');
}
function getDefaultFile() {
    return join(getBaseDir(), 'default');
}
async function ensureConfigDir() {
    await mkdir(getConfigDir(), { recursive: true });
}
export async function listConfigs() {
    try {
        await ensureConfigDir();
        const files = await readdir(getConfigDir());
        return files
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
    }
    catch {
        return [];
    }
}
export async function loadConfig(name) {
    try {
        const path = join(getConfigDir(), `${name}.json`);
        const data = await readFile(path, 'utf-8');
        const parsed = JSON.parse(data);
        return { ...parsed, name };
    }
    catch {
        return null;
    }
}
export async function loadDefaultConfig() {
    try {
        const defaultName = await readFile(getDefaultFile(), 'utf-8');
        return await loadConfig(defaultName.trim());
    }
    catch {
        const configs = await listConfigs();
        if (configs.length > 0) {
            return await loadConfig(configs[0]);
        }
        return null;
    }
}
export async function validateDownloadPath(path) {
    try {
        // Check if path exists
        const stats = await stat(path);
        if (!stats.isDirectory()) {
            return { valid: false, error: 'Path exists but is not a directory' };
        }
        return { valid: true };
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            // Path doesn't exist, try to create it
            try {
                await mkdir(path, { recursive: true });
                return { valid: true };
            }
            catch (createError) {
                return { valid: false, error: `Failed to create directory: ${createError.message}` };
            }
        }
        return { valid: false, error: error.message };
    }
}
export async function saveConfig(name, config) {
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
export async function deleteConfig(name) {
    try {
        const path = join(getConfigDir(), `${name}.json`);
        await unlink(path);
    }
    catch {
        // Ignore errors
    }
}
export async function setDefaultConfig(name) {
    await ensureConfigDir();
    await writeFile(getDefaultFile(), name);
}
export async function configExists(name) {
    try {
        const path = join(getConfigDir(), `${name}.json`);
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
