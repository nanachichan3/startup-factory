/**
 * Discord Gateway for Startup Factory
 * 
 * A Discord bot that lets Yev manage the factory from Discord.
 * Commands:
 *   !factory status     - Show factory health & component status
 *   !factory tasks      - List active startup tasks
 *   !factory startups   - List all startups in the factory
 *   !factory create <name> <idea> - Create a new startup
 *   !factory execute <id> - Trigger expert loop workflow for a startup
 *   !factory help       - Show this help message
 * 
 * Run alongside the main HTTP server on port 3000.
 */

import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, Message, ChannelType } from 'discord.js';
import { isDatabaseHealthy, prisma } from '../db/client.js';
import { isMem0Available } from '../memory/mem0.js';
import { harness } from '../index.js';

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const COMMAND_PREFIX = '!factory';
const OWNER_ID = process.env.DISCORD_OWNER_ID; // Optional: restrict to owner

let bot: Client | null = null;

/**
 * Initialize and start the Discord bot.
 * Call this at harness startup if DISCORD_BOT_TOKEN is set.
 */
export async function startDiscordBot(): Promise<boolean> {
  if (!DISCORD_TOKEN) {
    console.log('[Discord] DISCORD_BOT_TOKEN not set — Discord bot disabled');
    return false;
  }

  try {
    bot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    bot.once('ready', () => {
      console.log(`[Discord] Bot logged in as ${bot?.user?.tag}`);
      bot?.user?.setActivity(`${COMMAND_PREFIX} help`, { type: 3 });
    });

    bot.on('messageCreate', handleMessage);
    bot.on('error', (err: any) => console.error('[Discord] Bot error:', err));

    await bot.login(DISCORD_TOKEN);
    return true;
  } catch (error) {
    console.error('[Discord] Failed to start bot:', error);
    return false;
  }
}

/**
 * Check if the bot is currently connected.
 */
export function isDiscordBotConnected(): boolean {
  return bot?.isReady() ?? false;
}

/**
 * Get the bot's invite URL (for adding to servers).
 */
export function getBotInviteUrl(): string {
  if (!bot?.isReady()) return 'Bot not connected';
  const permissions = '326二代整数'; // Base permissions for reading/sending messages
  return `https://discord.com/api/oauth2/authorize?client_id=${bot.user?.id}&permissions=${permissions}&scope=bot`;
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

async function handleMessage(message: Message): Promise<void> {
  // Ignore bots
  if (message.author.bot) return;
  
  // Check for command prefix
  if (!message.content.trim().toLowerCase().startsWith(COMMAND_PREFIX)) return;
  
  // Restrict to owner if configured
  if (OWNER_ID && message.author.id !== OWNER_ID) {
    await message.reply('⚠️ Only the factory owner can use these commands.');
    return;
  }

  const args = message.content.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase() ?? 'help';

  try {
    switch (command) {
      case 'status':
        await handleStatus(message);
        break;
      case 'tasks':
        await handleTasks(message);
        break;
      case 'startups':
        await handleStartups(message);
        break;
      case 'create':
        await handleCreate(message, args);
        break;
      case 'execute':
        await handleExecute(message, args);
        break;
      case 'help':
      default:
        await handleHelp(message);
    }
  } catch (error) {
    console.error(`[Discord] Command ${command} failed:`, error);
    await message.reply(`❌ Command failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function handleStatus(message: Message): Promise<void> {
  const temporalStatus = harness.getTemporalStatus();
  const dbHealthy = await isDatabaseHealthy();
  const mem0Enabled = isMem0Available();
  const botConnected = isDiscordBotConnected();

  const embed = {
    title: '🏭 Startup Factory Status',
    color: temporalStatus.connected && dbHealthy ? 0x2ECC71 : 0xE74C3C,
    fields: [
      {
        name: '🤖 Bot',
        value: botConnected ? 'Online' : 'Offline',
        inline: true,
      },
      {
        name: '💾 Database',
        value: dbHealthy ? 'Connected' : 'Disconnected',
        inline: true,
      },
      {
        name: '🧠 Mem0 Memory',
        value: mem0Enabled ? 'Enabled' : 'Disabled',
        inline: true,
      },
      {
        name: '⏱️ Temporal',
        value: temporalStatus.connected ? `Connected (${temporalStatus.type})` : 'Not Connected',
        inline: true,
      },
      {
        name: '📡 API Address',
        value: temporalStatus.address || 'N/A',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Startup Factory • v1.0' },
  };

  await message.reply({ embeds: [embed] });
}

async function handleHelp(message: Message): Promise<void> {
  const embed = {
    title: '📋 Startup Factory Commands',
    color: 0x3498DB,
    fields: [
      {
        name: '!factory status',
        value: 'Show factory health & component status',
        inline: false,
      },
      {
        name: '!factory tasks',
        value: 'List active startup tasks',
        inline: false,
      },
      {
        name: '!factory startups',
        value: 'List all startups in the factory',
        inline: false,
      },
      {
        name: '!factory create <name> <idea>',
        value: 'Create a new startup (e.g. `!factory create MyStartup Build an AI agent`)',
        inline: false,
      },
      {
        name: '!factory execute <id>',
        value: 'Trigger expert loop workflow for a startup',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Startup Factory • Powered by Temporal + Mem0' },
  };

  await message.reply({ embeds: [embed] });
}

async function handleTasks(message: Message): Promise<void> {
  if (!prisma) {
    await message.reply('❌ Database not connected.');
    return;
  }

  const runs = await prisma.workflowRun.findMany({
    where: { status: { not: 'completed' } },
    take: 10,
    orderBy: { startedAt: 'desc' },
  });

  if (runs.length === 0) {
    await message.reply('✅ No active workflows. The factory is idle!');
    return;
  }

  const runList = runs.map((r: any, i: any) => {
    return `**${i + 1}.** [${r.status}] ${r.type} (startupId: ${r.startupId.slice(0, 8)}...)`;
  }).join('\n');

  const embed = {
    title: `📋 Active Workflows (${runs.length})`,
    description: runList,
    color: 0xF39C12,
    timestamp: new Date().toISOString(),
  };

  await message.reply({ embeds: [embed] });
}

async function handleStartups(message: Message): Promise<void> {
  if (!prisma) {
    await message.reply('❌ Database not connected.');
    return;
  }

  const startups = await prisma.startup.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
  });

  if (startups.length === 0) {
    await message.reply('🏭 No startups yet. Create one with `!factory create <name> <idea>`');
    return;
  }

  const startupList = startups.map((s: any, i: any) => {
    const stage = s.stage ?? 'idea';
    return `**${i + 1}.** \`${s.id}\` **${s.name}** — ${stage}`;
  }).join('\n');

  const embed = {
    title: `🏭 Startups (${startups.length})`,
    description: startupList,
    color: 0x9B59B6,
    timestamp: new Date().toISOString(),
  };

  await message.reply({ embeds: [embed] });
}

async function handleCreate(message: Message, args: string[]): Promise<void> {
  if (args.length < 2) {
    await message.reply('❌ Usage: `!factory create <name> <idea>`\nExample: `!factory create MyStartup Build an AI agent`');
    return;
  }

  const name = args[0];
  const idea = args.slice(1).join(' ');

  if (!prisma) {
    await message.reply('❌ Database not connected.');
    return;
  }

  await message.reply(`🔨 Creating startup **${name}**...`);

  try {
    const startup = await prisma.startup.create({
      data: {
        name,
        description: idea,
        stage: 'Ideation',
        founderBrief: idea,
      },
    });

    const embed = {
      title: '✅ Startup Created!',
      description: `**${startup.name}**\n${startup.description}`,
      color: 0x2ECC71,
      fields: [
        { name: 'ID', value: `\`${startup.id}\``, inline: true },
        { name: 'Stage', value: startup.stage ?? 'idea', inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[Discord] Create startup failed:', error);
    await message.reply(`❌ Failed to create startup: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function handleExecute(message: Message, args: string[]): Promise<void> {
  if (args.length < 1) {
    await message.reply('❌ Usage: `!factory execute <startup_id>`\nExample: `!factory execute 123`');
    return;
  }

  const startupId = args[0];

  if (!prisma) {
    await message.reply('❌ Database not connected.');
    return;
  }

  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) {
    await message.reply(`❌ Startup with ID \`${startupId}\` not found.`);
    return;
  }

  await message.reply(`⚙️ Starting expert loop for **${startup.name}**...\n${startup.description?.slice(0, 200)}`);

  try {
    // Run the expert loop
    const result = await harness.runExpertLoop(
      startup.description || startup.founderBrief || '',
      3
    );

    // Create an artifact with the result
    await prisma.artifact.create({
      data: {
        startupId: startup.id,
        type: 'expert_loop_result',
        title: `Expert Loop Result - ${new Date().toISOString()}`,
        content: result,
        agentRole: 'factory',
      },
    });

    // Update startup last executed
    await prisma.startup.update({
      where: { id: startupId },
      data: { lastExecutedAt: new Date() },
    });

    const embed = {
      title: `✅ Expert Loop Complete for **${startup.name}**`,
      description: result.slice(0, 400) + (result.length > 400 ? '...' : ''),
      color: 0x2ECC71,
      fields: [
        { name: 'Startup', value: startup.name, inline: true },
        { name: 'Stage', value: startup.stage ?? 'Ideation', inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[Discord] Execute failed:', error);
    await message.reply(`❌ Expert loop failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Send a message to a Discord channel by ID (for proactive notifications).
 */
export async function sendChannelMessage(channelId: string, content: string): Promise<void> {
  if (!bot?.isReady()) return;
  try {
    const channel = await bot.channels.fetch(channelId);
    if (channel?.type === ChannelType.GuildText) {
      await channel.send(content);
    }
  } catch (error) {
    console.error('[Discord] Failed to send message:', error);
  }
}

export default { startDiscordBot, isDiscordBotConnected, getBotInviteUrl, sendChannelMessage };
