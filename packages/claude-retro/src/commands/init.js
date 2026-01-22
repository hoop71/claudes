import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { saveConfig, getDefaultConfigPath, getDefaultDataDir, is1PasswordAvailable } from '../../lib/config.js';
import { initDatabase } from '../database.js';
import { join } from 'path';

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function initCommand(options) {
  console.log('\n🚀 Claude Retro Setup\n');
  console.log('This wizard will help you configure the retrospective tracker.\n');

  // Check prerequisites
  console.log('Checking prerequisites...');
  if (!checkCommand('git')) {
    console.error('✗ git not found. Please install git first.');
    process.exit(1);
  }
  if (!checkCommand('jq')) {
    console.log('⚠️  jq not found. Optional but recommended for bash hooks: brew install jq');
  }
  console.log('✓ Prerequisites met\n');

  const defaultDataDir = getDefaultDataDir();
  const defaultConfigPath = getDefaultConfigPath();
  const configExists = existsSync(defaultConfigPath);

  if (configExists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Configuration already exists at ${defaultConfigPath}. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log('\nSetup cancelled.');
      process.exit(0);
    }
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'dataDir',
      message: 'Data directory:',
      default: defaultDataDir
    },
    {
      type: 'list',
      name: 'privacyMode',
      message: 'Privacy mode (how much prompt data to store):',
      choices: [
        { name: 'Minimal - Only timestamp and prompt length', value: 'minimal' },
        { name: 'Summary - First 200 characters (recommended)', value: 'summary' },
        { name: 'Full - Complete prompt text', value: 'full' }
      ],
      default: 'summary'
    },
    {
      type: 'list',
      name: 'timezone',
      message: 'Timezone for scheduling reports:',
      choices: [
        { name: 'America/New_York (EST/EDT)', value: 'America/New_York' },
        { name: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
        { name: 'America/Denver (MST/MDT)', value: 'America/Denver' },
        { name: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
        { name: 'Europe/London (GMT/BST)', value: 'Europe/London' },
        { name: 'UTC', value: 'UTC' }
      ],
      default: 'America/New_York'
    },
    {
      type: 'confirm',
      name: 'enableJira',
      message: 'Enable Jira integration?',
      default: false
    }
  ]);

  const config = {
    dataDir: answers.dataDir,
    privacyMode: answers.privacyMode,
    timezone: answers.timezone,
    sessionGapMinutes: 30,
    issueKeyPatterns: [],
    weeklyReportDay: 'Friday',
    weeklyReportTime: '15:00'
  };

  if (answers.enableJira) {
    const use1Password = is1PasswordAvailable();

    const jiraAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'jiraUrl',
        message: 'Jira URL (e.g., https://yourcompany.atlassian.net):',
        validate: (input) => {
          if (!input.startsWith('http')) {
            return 'Please enter a valid URL starting with http:// or https://';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'jiraUsername',
        message: 'Jira username/email:',
        validate: (input) => input.length > 0 || 'Username is required'
      },
      {
        type: 'list',
        name: 'tokenStorage',
        message: 'How would you like to store your Jira API token?',
        choices: use1Password
          ? [
              { name: '1Password secret reference (recommended)', value: '1password' },
              { name: 'Plain text (not recommended)', value: 'plain' }
            ]
          : [
              { name: 'Plain text (1Password not available)', value: 'plain' }
            ]
      },
      {
        type: 'input',
        name: 'jiraApiToken',
        message: (answers) =>
          answers.tokenStorage === '1password'
            ? 'Jira API token (1Password reference, e.g., op://vault/item/field):'
            : 'Jira API token:',
        validate: (input) => input.length > 0 || 'API token is required'
      },
      {
        type: 'input',
        name: 'issueKeyPatterns',
        message: 'Issue key patterns (comma-separated regex, e.g., PROJ-\\d+,TASK-\\d+):',
        default: 'PROJ-\\d+,TASK-\\d+',
        filter: (input) => input.split(',').map(s => s.trim()).filter(Boolean)
      }
    ]);

    config.jiraUrl = jiraAnswers.jiraUrl;
    config.jiraUsername = jiraAnswers.jiraUsername;
    config.jiraApiToken = jiraAnswers.jiraApiToken;
    config.issueKeyPatterns = jiraAnswers.issueKeyPatterns;
  }

  // Save configuration
  console.log('\n📝 Saving configuration...');
  const configPath = saveConfig(config);
  console.log(`✓ Configuration saved to ${configPath}`);

  // Initialize database
  console.log('\n🗄️  Initializing database...');
  const dbPath = join(config.dataDir.replace('~', process.env.HOME), 'retro.db');
  initDatabase(dbPath);

  console.log('\n✅ Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Install hook for your tool: claude-retro hook install <tool>');
  console.log('  2. Start working in your tool');
  console.log('  3. Process logs: claude-retro process');
  console.log('  4. Generate report: claude-retro report\n');

  if (options.tool) {
    console.log(`Installing hook for ${options.tool}...`);
    const { hookCommand } = await import('./hook.js');
    await hookCommand('install', options.tool, {});
  }
}
