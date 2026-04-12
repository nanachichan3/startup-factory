import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleFactoryCommand } from './commands.js';

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('[Discord] ERROR: DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
    ],
  });

  client.once('ready', () => {
    console.log(`[Discord] Bot logged in as: ${client.user?.tag}`);
    console.log(`[Discord] Bot ID: ${client.user?.id}`);
    client.user?.setPresence({
      status: 'online',
      activities: [{
        name: '!factory help',
        type: 0, // PLAYING
      }],
    });
  });

  client.on('error', (error) => {
    console.error('[Discord] Client error:', error);
  });

  client.on('messageCreate', async (message) => {
    // Ignore bot messages and system messages
    if (message.author.bot || message.system) return;

    const content = message.content.trim();

    // Only handle messages that start with !factory
    if (!content.toLowerCase().startsWith('!factory')) return;

    // Extract the command part (everything after !factory)
    const commandContent = content.slice('!factory'.length).trim();
    
    // If just whitespace or empty after !factory, show help
    if (!commandContent) {
      await message.reply('👋 Hi! Use `!factory help` to see available commands.');
      return;
    }

    console.log(`[Discord] Received command: !factory ${commandContent} (from ${message.author.tag})`);

    try {
      await handleFactoryCommand(commandContent, message);
    } catch (error) {
      console.error('[Discord] Command error:', error);
      await message.reply('❌ An error occurred while processing your command.');
    }
  });

  client.on('disconnect', () => {
    console.log('[Discord] Bot disconnected. Will attempt to reconnect...');
  });

  return client;
}

export async function login(client: Client): Promise<void> {
  try {
    await client.login(DISCORD_TOKEN);
    console.log('[Discord] Bot login successful');
  } catch (error) {
    console.error('[Discord] Failed to login:', error);
    throw error;
  }
}
