import { readFileSync, existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { execSync } from 'child_process';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default config locations (checked in order)
const DEFAULT_CONFIG_LOCATIONS = [
  process.env.CLAUDE_RETRO_CONFIG,
  process.env.DEV_RETRO_CONFIG,
  join(homedir(), '.claude-retro', 'config.json'),
  join(homedir(), '.claude', 'plugins', 'claude-retro', 'config.json'), // Backward compatibility
];

const ajv = new Ajv();

/**
 * Resolves 1Password references (op://...) to actual values
 * Supports account-specific references: op://vault/item/field?account=yourcompany.1password.com
 */
function resolveSecretReference(value) {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.startsWith('op://')) {
    try {
      // Check if account is specified in the reference
      const [ref, accountParam] = value.split('?account=');
      const command = accountParam
        ? `op read "${ref}" --account "${accountParam}"`
        : `op read "${value}"`;

      return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
      throw new Error(`Failed to resolve 1Password reference: ${value}\n${error.message}`);
    }
  }

  return value;
}

/**
 * Recursively resolves all secret references in config object
 */
function resolveSecrets(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return resolveSecretReference(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(resolveSecrets);
  }

  const resolved = {};
  for (const [key, value] of Object.entries(obj)) {
    resolved[key] = resolveSecrets(value);
  }
  return resolved;
}

/**
 * Expands ~ to home directory in paths
 */
function expandPath(path) {
  if (typeof path === 'string' && path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Gets the default config path by checking multiple locations
 * Returns the first existing config file, or the primary default location
 */
export function getDefaultConfigPath() {
  // Check each location in order
  for (const location of DEFAULT_CONFIG_LOCATIONS) {
    if (location && existsSync(location)) {
      return location;
    }
  }

  // If no config found, return the primary default location
  return join(homedir(), '.claude-retro', 'config.json');
}

/**
 * Gets the default data directory path
 */
export function getDefaultDataDir() {
  const configDir = dirname(getDefaultConfigPath());
  return join(configDir, 'data');
}

/**
 * Saves configuration to the specified path
 */
export function saveConfig(config, configPath = null) {
  const actualConfigPath = configPath || getDefaultConfigPath();
  const configDir = dirname(actualConfigPath);

  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Write config
  writeFileSync(actualConfigPath, JSON.stringify(config, null, 2), 'utf-8');

  return actualConfigPath;
}

/**
 * Loads and validates configuration
 */
export function loadConfig(configPath = null) {
  const actualConfigPath = configPath || getDefaultConfigPath();

  // Check if config exists
  try {
    const configContent = readFileSync(actualConfigPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Load schema - try package location first, then plugin location
    const packageRoot = join(__dirname, '..');
    const schemaLocations = [
      join(packageRoot, 'config', 'schema.json'),
      join(packageRoot, 'config', 'config.schema.json'), // Backward compat
    ];

    let schema;
    for (const schemaPath of schemaLocations) {
      if (existsSync(schemaPath)) {
        schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        break;
      }
    }

    if (!schema) {
      throw new Error('Config schema not found');
    }

    // Validate config
    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      throw new Error(`Invalid configuration:\n${JSON.stringify(validate.errors, null, 2)}`);
    }

    // Resolve secret references
    const resolvedConfig = resolveSecrets(config);

    // Expand paths
    resolvedConfig.dataDir = expandPath(resolvedConfig.dataDir);

    // Set defaults
    resolvedConfig.sessionGapMinutes = resolvedConfig.sessionGapMinutes || 30;
    resolvedConfig.issueKeyPatterns = resolvedConfig.issueKeyPatterns || ['[A-Z]+-\\d+'];
    resolvedConfig.weeklyReportDay = resolvedConfig.weeklyReportDay || 'Friday';
    resolvedConfig.weeklyReportTime = resolvedConfig.weeklyReportTime || '15:00';

    return resolvedConfig;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Configuration file not found at ${actualConfigPath}\n` +
        'Run "claude-retro init" to create your configuration.'
      );
    }
    throw error;
  }
}

/**
 * Checks if 1Password CLI is available
 */
export function is1PasswordAvailable() {
  try {
    execSync('which op', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export default {
  loadConfig,
  saveConfig,
  getDefaultConfigPath,
  getDefaultDataDir,
  is1PasswordAvailable,
  resolveSecretReference
};
