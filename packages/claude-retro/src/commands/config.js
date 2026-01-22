import { loadConfig, getDefaultConfigPath } from '../../lib/config.js';
import { existsSync, readFileSync } from 'fs';

export async function configCommand(options) {
  try {
    if (options.path) {
      // Show config file path
      const configPath = getDefaultConfigPath();
      console.log(configPath);
      return;
    }

    if (options.show) {
      // Show current configuration
      const config = loadConfig();
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (options.validate) {
      // Validate configuration
      try {
        const config = loadConfig();
        console.log('✅ Configuration is valid\n');
        console.log('Config file:', getDefaultConfigPath());
        console.log('Data directory:', config.dataDir);
        console.log('Privacy mode:', config.privacyMode);
        console.log('Jira integration:', config.jiraUrl ? 'enabled' : 'disabled');
        return;
      } catch (error) {
        console.error('❌ Configuration is invalid:', error.message);
        process.exit(1);
      }
    }

    // Default: show config path and basic info
    const configPath = getDefaultConfigPath();
    if (existsSync(configPath)) {
      console.log('Configuration file:', configPath);
      const config = loadConfig();
      console.log('Data directory:', config.dataDir);
      console.log('Privacy mode:', config.privacyMode);
      console.log('\nUse --show to see full configuration');
      console.log('Use --validate to validate configuration');
    } else {
      console.log('No configuration found.');
      console.log('Run "claude-retro init" to create configuration.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
