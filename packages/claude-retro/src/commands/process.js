import { loadConfig } from '../../lib/config.js';
import { initDatabase, getDatabase } from '../database.js';
import { existsSync } from 'fs';
import { join } from 'path';

// Import the processor main function
async function processLogsOnce() {
  // Dynamic import to avoid circular dependencies
  const processor = await import('../processor.js');

  // The processor.js exports a default function or named export
  // We'll need to adjust this based on the actual export
  if (typeof processor.default === 'function') {
    await processor.default();
  } else if (typeof processor.processLogs === 'function') {
    await processor.processLogs();
  } else {
    throw new Error('processor.js does not export a processLogs function');
  }
}

export async function processCommand(options) {
  try {
    const config = loadConfig();

    // Ensure database exists
    const dataDir = config.dataDir.replace('~', process.env.HOME);
    const dbPath = join(dataDir, 'retro.db');

    if (!existsSync(dbPath)) {
      console.log('🗄️  Database not found. Initializing...');
      initDatabase(dbPath);
    }

    if (options.watch) {
      console.log('👁️  Watching for new logs...');
      console.log(`   Polling interval: ${options.interval} minute(s)`);
      console.log('   Press Ctrl+C to stop\n');

      // Process immediately
      await processLogsOnce();

      // Then poll on interval
      const intervalMs = parseInt(options.interval) * 60 * 1000;
      setInterval(async () => {
        try {
          await processLogsOnce();
        } catch (error) {
          console.error('Error processing logs:', error.message);
        }
      }, intervalMs);
    } else {
      // Process once and exit
      await processLogsOnce();
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
