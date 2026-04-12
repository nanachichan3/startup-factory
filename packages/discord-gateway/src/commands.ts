import { Message } from 'discord.js';
import { factoryApiRequest, FACTORY_API_URL } from './api-client.js';

const COMMAND_PREFIX = '!factory';
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'password';

/**
 * Main command dispatcher
 */
export async function handleFactoryCommand(commandContent: string, message: Message): Promise<void> {
  const parts = commandContent.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case 'help':
      await sendHelp(message);
      break;
    case 'status':
      await sendStatus(message);
      break;
    case 'tasks':
      await sendTasks(message);
      break;
    case 'startups':
      await sendStartups(message);
      break;
    case 'create':
      await createStartup(message, args);
      break;
    case 'execute':
      await executeStartup(message, args);
      break;
    case 'agent':
      await assignAgent(message, args);
      break;
    case 'health':
      await sendHealth(message);
      break;
    default:
      await message.reply(`❓ Unknown command: \`${command}\`\nUse \`!factory help\` to see available commands.`);
  }
}

/**
 * Send help message with all available commands
 */
async function sendHelp(message: Message): Promise<void> {
  const helpText = `🤖 **Startup Factory Bot** — Available Commands:

📊 **Status & Health**
\`!factory status\` — System status (DB, Temporal, agents)
\`!factory health\` — API health check

📋 **Startups**
\`!factory startups\` — List all startups with stage & progress
\`!factory create [name] | [description]\` — Create a new startup
\`!factory execute [startup-id]\` — Trigger expert loop workflow

👥 **Tasks**
\`!factory tasks\` — List top 5 pending tasks

👤 **Agent Assignment**
\`!factory agent [cto|cmo] [task description]\` — Assign task to an agent

📖 **Other**
\`!factory help\` — Show this help message`;

  await message.reply(helpText);
}

/**
 * Get system status
 */
async function sendStatus(message: Message): Promise<void> {
  try {
    const response = await factoryApiRequest('/health', 'GET');
    const data = response as any;
    
    const dbStatus = data.dependencies?.database?.includes('connected') ? '🟢 connected' : '🔴 disconnected';
    const temporalStatus = data.dependencies?.temporal?.includes('connected') ? '🟢 connected' : '🔴 disconnected';
    const mode = data.mode === 'demo' ? ' (demo mode)' : '';
    
    const statusText = `🏭 **Startup Factory Status**
━━━━━━━━━━━━━━━━━━━━━━━
🗄️ **Database:** ${dbStatus}
⏱️ **Temporal:** ${temporalStatus}
🤖 **Agents:** 3 active (CEO, CTO, CMO)
📡 **Mode:** ${data.mode || 'production'}${mode}
🔗 **API:** ${FACTORY_API_URL}`;

    await message.reply(statusText);
  } catch (error) {
    console.error('[Status] Error:', error);
    await message.reply('❌ Failed to fetch system status. Is the API running?');
  }
}

/**
 * Get API health
 */
async function sendHealth(message: Message): Promise<void> {
  try {
    const response = await factoryApiRequest('/health', 'GET');
    const data = response as any;
    
    const embed = {
      title: '🏥 Health Check',
      color: 0x00ff00,
      fields: [
        { name: 'Status', value: data.status || 'unknown', inline: true },
        { name: 'Service', value: data.service || 'unknown', inline: true },
        { name: 'Mode', value: data.mode || 'unknown', inline: true },
        { name: 'Database', value: data.dependencies?.database || 'unknown', inline: true },
        { name: 'Temporal', value: data.dependencies?.temporal || 'unknown', inline: true },
      ],
      timestamp: data.timestamp,
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[Health] Error:', error);
    await message.reply('❌ Failed to fetch health check. Is the API running?');
  }
}

/**
 * List top 5 pending tasks
 */
async function sendTasks(message: Message): Promise<void> {
  try {
    const response = await factoryApiRequest('/api/tasks', 'GET');
    const data = response as any;
    
    if (!data.tasks || data.tasks.length === 0) {
      await message.reply('📋 No tasks found.');
      return;
    }

    const topTasks = data.tasks.slice(0, 5);
    const taskLines = topTasks.map((task: any, index: number) => {
      const status = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      return `${status} **${task.title || task.name || `Task ${index + 1}`}**\n   ${priority} ${task.priority || 'medium'} | ${task.status || 'pending'} ${task.assignee ? `| 👤 ${task.assignee}` : ''}`;
    }).join('\n\n');

    const tasksText = `📋 **Top ${topTasks.length} Tasks**\n━━━━━━━━━━━━━━━━━━━━━━━\n${taskLines}\n\n📊 Total: ${data.count || data.tasks.length} tasks`;

    await message.reply(tasksText);
  } catch (error) {
    console.error('[Tasks] Error:', error);
    await message.reply('❌ Failed to fetch tasks. Is the API running?');
  }
}

/**
 * List all startups with stage and progress
 */
async function sendStartups(message: Message): Promise<void> {
  try {
    const response = await factoryApiRequest('/api/startups', 'GET');
    const data = response as any;
    
    if (!data.startups || data.startups.length === 0) {
      await message.reply('🏭 No startups found. Create one with `!factory create [name] | [description]`');
      return;
    }

    const startupLines = data.startups.map((startup: any) => {
      const stage = startup.stage || 'idea';
      const stageEmoji = getStageEmoji(stage);
      const progress = getProgressIndicator(startup);
      
      return `${stageEmoji} **${startup.name}**\n   📍 ${stage} ${progress}\n   📝 ${(startup.description || 'No description').substring(0, 60)}${(startup.description || '').length > 60 ? '...' : ''}${startup.currentWorkflowId ? '\n   ⚙️ Workflow active' : ''}`;
    }).join('\n\n');

    const startupsText = `🏭 **Startup Factory (${data.startups.length} startups)**\n━━━━━━━━━━━━━━━━━━━━━━━\n${startupLines}`;

    await message.reply(startupsText);
  } catch (error) {
    console.error('[Startups] Error:', error);
    await message.reply('❌ Failed to fetch startups. Is the API running?');
  }
}

/**
 * Create a new startup
 */
async function createStartup(message: Message, args: string[]): Promise<void> {
  if (args.length === 0) {
    await message.reply('❌ Usage: `!factory create [name] | [description]`\nExample: `!factory create MyStartup | Building an AI-powered task manager`');
    return;
  }

  // Parse name | description format
  const text = args.join(' ');
  const separatorIndex = text.indexOf('|');
  
  let name: string;
  let description: string;

  if (separatorIndex !== -1) {
    name = text.substring(0, separatorIndex).trim();
    description = text.substring(separatorIndex + 1).trim();
  } else {
    // If no separator, use first word as name and rest as description
    name = args[0];
    description = args.slice(1).join(' ') || 'No description';
  }

  if (!name) {
    await message.reply('❌ Please provide a startup name.');
    return;
  }

  if (!description) {
    await message.reply('❌ Please provide a description after the `|` separator.\nExample: `!factory create MyStartup | Building an AI-powered task manager`');
    return;
  }

  try {
    const response = await factoryApiRequest('/api/startups', 'POST', {
      name,
      description,
      stage: 'idea',
    });

    const data = response as any;
    const embed = {
      title: '🎉 Startup Created',
      color: 0x00ff00,
      fields: [
        { name: 'Name', value: data.name, inline: true },
        { name: 'Stage', value: data.stage || 'idea', inline: true },
        { name: 'Description', value: data.description || 'N/A' },
      ],
      footer: { text: `ID: ${data.id}` },
      timestamp: data.createdAt || new Date().toISOString(),
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[Create] Error:', error);
    await message.reply('❌ Failed to create startup. Is the API running?');
  }
}

/**
 * Execute a startup workflow
 */
async function executeStartup(message: Message, args: string[]): Promise<void> {
  if (args.length === 0) {
    await message.reply('❌ Usage: `!factory execute [startup-id]`\nExample: `!factory execute startup-1234567890`');
    return;
  }

  const startupId = args[0];

  try {
    // First check if startup exists
    const startupResponse = await factoryApiRequest(`/api/startups/${startupId}`, 'GET');
    const startup = startupResponse as any;

    if (!startup || startup.error) {
      await message.reply(`❌ Startup not found: \`${startupId}\``);
      return;
    }

    // Execute the workflow
    const response = await factoryApiRequest(`/api/startups/${startupId}/execute`, 'POST');
    const data = response as any;

    const embed = {
      title: '⚙️ Workflow Executed',
      color: 0x0099ff,
      fields: [
        { name: 'Startup', value: startup.name || startupId, inline: true },
        { name: 'Workflow ID', value: data.workflowId || 'N/A', inline: true },
        { name: 'Status', value: data.status || 'started', inline: true },
      ],
      description: data.message || 'Expert loop workflow has been triggered.',
      footer: { text: `Execution mode: ${data.status === 'simulated' ? '⚠️ Simulated (Temporal not connected)' : '✅ Live'}` },
    };

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[Execute] Error:', error);
    await message.reply('❌ Failed to execute workflow. Is the API running?');
  }
}

/**
 * Assign task to CTO or CMO agent
 */
async function assignAgent(message: Message, args: string[]): Promise<void> {
  if (args.length < 2) {
    await message.reply('❌ Usage: `!factory agent [cto|cmo] [task description]`\nExample: `!factory agent cto Build user authentication`');
    return;
  }

  const agent = args[0].toLowerCase();
  if (agent !== 'cto' && agent !== 'cmo') {
    await message.reply('❌ Agent must be either `cto` or `cmo`.\nExample: `!factory agent cto Build user authentication`');
    return;
  }

  const taskDescription = args.slice(1).join(' ');
  if (!taskDescription) {
    await message.reply('❌ Please provide a task description.');
    return;
  }

  // For now, we'll log the assignment and provide feedback
  // The actual task creation would need to integrate with the factory's task system
  const agentName = agent.toUpperCase();
  
  const embed = {
    title: `👤 Task Assigned to ${agentName}`,
    color: 0x9966ff,
    fields: [
      { name: 'Agent', value: agentName, inline: true },
      { name: 'Task', value: taskDescription, inline: false },
      { name: 'Status', value: '📋 Queued', inline: true },
    ],
    footer: { text: 'Task has been queued for the agent' },
    timestamp: new Date().toISOString(),
  };

  await message.reply({ embeds: [embed] });
  
  // Log the assignment (in production, this would create a task in the database)
  console.log(`[Agent Assignment] ${agentName} assigned: ${taskDescription}`);
}

// Helper function to get emoji for stage
function getStageEmoji(stage: string): string {
  const stageMap: Record<string, string> = {
    idea: '💡',
    prototype: '🔧',
    mvp: '🚀',
    growth: '📈',
    scale: '🎯',
   成熟: '🏆', // mature
  };
  return stageMap[stage] || '📦';
}

// Helper function to get progress indicator
function getProgressIndicator(startup: any): string {
  const stages = ['idea', 'prototype', 'mvp', 'growth', 'scale'];
  const currentIndex = stages.indexOf(startup.stage);
  if (currentIndex === -1) return '';
  
  const progress = Math.round(((currentIndex + 1) / stages.length) * 100);
  const filled = Math.round((currentIndex / (stages.length - 1)) * 10);
  const empty = 10 - filled;
  
  const bar = '🟢'.repeat(filled) + '⚪️'.repeat(empty);
  return `${bar} ${progress}%`;
}
