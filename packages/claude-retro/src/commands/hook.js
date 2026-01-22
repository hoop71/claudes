import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates', 'hooks');

const HOOK_LOCATIONS = {
  'claude-code': {
    path: join(homedir(), '.claude', 'hooks', 'UserPromptSubmit.sh'),
    description: 'Claude Code UserPromptSubmit hook'
  },
  'cursor': {
    path: join(homedir(), '.cursor', 'hooks', 'on-prompt.sh'),
    description: 'Cursor on-prompt hook (experimental)'
  }
};

function getTemplateForTool(tool) {
  if (tool === 'claude-code') {
    return join(TEMPLATES_DIR, 'claude-code.sh');
  } else if (tool === 'cursor') {
    return join(TEMPLATES_DIR, 'cursor.sh');
  } else {
    return join(TEMPLATES_DIR, 'generic.sh');
  }
}

async function installHook(tool) {
  const hookInfo = HOOK_LOCATIONS[tool];

  if (!hookInfo && tool !== 'generic') {
    console.error(`Unknown tool: ${tool}`);
    console.log('Supported tools: claude-code, cursor, generic');
    process.exit(1);
  }

  const templatePath = getTemplateForTool(tool);

  if (!existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    console.log('Please ensure the package is properly installed.');
    process.exit(1);
  }

  if (tool === 'generic') {
    // For generic, just show the template
    const template = readFileSync(templatePath, 'utf-8');
    console.log('\n📋 Generic hook template:\n');
    console.log(template);
    console.log('\nCopy this template and adapt it for your development tool.');
    console.log('See templates/hooks/README.md for more information.\n');
    return;
  }

  const hookPath = hookInfo.path;
  const hookDir = dirname(hookPath);

  // Ensure hook directory exists
  if (!existsSync(hookDir)) {
    mkdirSync(hookDir, { recursive: true });
  }

  // Check if hook already exists
  if (existsSync(hookPath)) {
    console.log(`⚠️  Hook already exists at ${hookPath}`);
    console.log('Existing hook content:');
    console.log('---');
    console.log(readFileSync(hookPath, 'utf-8'));
    console.log('---\n');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Overwrite? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Installation cancelled.');
      return;
    }
  }

  // Read template and install
  const template = readFileSync(templatePath, 'utf-8');
  writeFileSync(hookPath, template, 'utf-8');
  chmodSync(hookPath, 0o755);

  console.log(`✅ Hook installed at ${hookPath}`);
  console.log(`   ${hookInfo.description}\n`);
  console.log('The hook will capture prompts automatically.');
  console.log('Run "claude-retro process" to process captured data.\n');
}

async function uninstallHook(tool) {
  const hookInfo = HOOK_LOCATIONS[tool];

  if (!hookInfo) {
    console.error(`Unknown tool: ${tool}`);
    process.exit(1);
  }

  const hookPath = hookInfo.path;

  if (!existsSync(hookPath)) {
    console.log(`Hook not found at ${hookPath}`);
    return;
  }

  const { unlinkSync } = await import('fs');
  unlinkSync(hookPath);

  console.log(`✅ Hook removed from ${hookPath}\n`);
}

async function testHook() {
  console.log('🧪 Testing hook...\n');

  // Create a test capture
  try {
    const testData = {
      timestamp: Date.now() / 1000,
      session_id: 'test-session',
      user_prompt: 'This is a test prompt',
      cwd: process.cwd(),
      git_branch: 'test-branch',
      git_remote: 'https://github.com/test/repo.git'
    };

    const { captureCommand } = await import('./capture.js');

    // Mock stdin for JSON input
    process.stdin.push(JSON.stringify(testData));
    process.stdin.push(null);

    await captureCommand({ json: true });

    console.log('✅ Hook test successful!');
    console.log('   Test data was captured.');
    console.log('   Run "claude-retro process" to process it.\n');
  } catch (error) {
    console.error('❌ Hook test failed:', error.message);
    process.exit(1);
  }
}

export async function hookCommand(action, tool, options) {
  if (action === 'install') {
    if (!tool) {
      console.error('Error: Tool name required');
      console.log('Usage: claude-retro hook install <tool>');
      console.log('Tools: claude-code, cursor, generic');
      process.exit(1);
    }
    await installHook(tool);
  } else if (action === 'uninstall') {
    if (!tool) {
      console.error('Error: Tool name required');
      process.exit(1);
    }
    await uninstallHook(tool);
  } else if (action === 'test') {
    await testHook();
  } else {
    console.error(`Unknown action: ${action}`);
    console.log('Actions: install, uninstall, test');
    process.exit(1);
  }
}
