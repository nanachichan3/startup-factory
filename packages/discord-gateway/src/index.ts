/**
 * Startup Factory Discord Gateway
 * 
 * A Discord bot that allows Yev to manage the startup factory
 * directly from Discord using !factory commands.
 */

import { config } from 'dotenv';
import { createDiscordClient, login } from './discord.js';

// Load environment variables from .env file
config();

console.log('═══════════════════════════════════════════');
console.log('  Startup Factory Discord Gateway');
console.log('═══════════════════════════════════════════');
console.log('');

// Verify required environment variables
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const FACTORY_API_URL = process.env.FACTORY_API_URL || 'http://localhost:3001';

console.log(`[Config] Discord Token: ${DISCORD_TOKEN ? '✓ Set' : '✗ MISSING'}`);
console.log(`[Config] Factory API: ${FACTORY_API_URL}`);
console.log(`[Config] Dashboard Auth: ${process.env.DASHBOARD_USER || 'admin'}:${process.env.DASHBOARD_PASS ? '✓ Set' : '✗ Using default'}`);
console.log('');

if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable is required');
  console.error('');
  console.error('To fix:');
  console.error('1. Go to https://discord.com/developers/applications');
  console.error('2. Create a new application (or use existing)');
  console.error('3. Go to "Bot" section');
  console.error('4. Click "Reset Token" to get your bot token');
  console.error('5. Set DISCORD_BOT_TOKEN in your environment or .env file');
  console.error('');
  process.exit(1);
}

// Create and login the Discord client
const client = createDiscordClient();

login(client)
  .then(() => {
    console.log('[Startup] Discord Gateway is running!');
    console.log('[Startup] Use !factory help in Discord to see commands');
  })
  .catch((error) => {
    console.error('[Startup] Failed to start Discord Gateway:', error);
    process.exit(1);
  });

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Received SIGINT, logging out...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Shutdown] Received SIGTERM, logging out...');
  client.destroy();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Fatal] Uncaught exception:', error);
  client.destroy();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled rejection at:', promise, 'reason:', reason);
});
