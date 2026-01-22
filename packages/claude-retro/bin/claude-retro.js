#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('claude-retro')
  .description('Automated developer retrospectives for any coding tool')
  .version(packageJson.version);

program
  .command('init')
  .description('Interactive setup wizard')
  .option('--tool <name>', 'Tool to integrate with (claude-code, cursor, etc.)')
  .action(async (options) => {
    const { initCommand } = await import('../src/commands/init.js');
    await initCommand(options);
  });

program
  .command('capture')
  .description('Capture a prompt (used by hooks)')
  .option('--json', 'Read JSON from stdin')
  .option('--prompt <text>', 'Prompt text')
  .option('--cwd <path>', 'Working directory')
  .action(async (options) => {
    const { captureCommand } = await import('../src/commands/capture.js');
    await captureCommand(options);
  });

program
  .command('process')
  .description('Process logs into database')
  .option('--watch', 'Watch for new logs and process continuously')
  .option('--interval <minutes>', 'Polling interval in watch mode (default: 1)', '1')
  .action(async (options) => {
    const { processCommand } = await import('../src/commands/process.js');
    await processCommand(options);
  });

program
  .command('report')
  .description('Generate retrospective report')
  .option('-d, --days <number>', 'Number of days to include', '7')
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .option('-f, --format <format>', 'Output format (markdown, json)', 'markdown')
  .action(async (options) => {
    const { reportCommand } = await import('../src/commands/report.js');
    await reportCommand(options);
  });

program
  .command('hook')
  .description('Hook management')
  .argument('<action>', 'Action: install, uninstall, test')
  .argument('[tool]', 'Tool name (claude-code, cursor, generic)')
  .action(async (action, tool, options) => {
    const { hookCommand } = await import('../src/commands/hook.js');
    await hookCommand(action, tool, options);
  });

program
  .command('config')
  .description('Configuration management')
  .option('--show', 'Show current configuration')
  .option('--path', 'Show configuration file path')
  .option('--validate', 'Validate configuration')
  .action(async (options) => {
    const { configCommand } = await import('../src/commands/config.js');
    await configCommand(options);
  });

program.parse();
