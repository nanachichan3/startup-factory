import { PrismaClient } from '@prisma/client';

// Singleton Prisma client for the harness
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Check if DATABASE_URL is configured
const hasDatabaseUrl = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('placeholder') &&
  process.env.DATABASE_URL.startsWith('postgresql://');

// Create Prisma client only if DATABASE_URL is valid
let prisma: PrismaClient | null = null;

if (hasDatabaseUrl) {
  prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });
  
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
  }
  
  console.log('[DB] Prisma client initialized with DATABASE_URL');
} else {
  console.warn('[DB] DATABASE_URL not configured or is placeholder - running in demo mode without database');
}

// Export prisma (may be null if no database)
export { prisma };

// Valid startup stages (8-stage lifecycle)
export const STARTUP_STAGES = [
  'idea',      // #9B59B6 - Purple
  'validation', // #3498DB - Blue
  'mvp',       // #E67E22 - Orange
  'launch',    // #2ECC71 - Green
  'distribution', // #1ABC9C - Teal
  'pmf',       // #F39C12 - Yellow
  'support',   // #95A5A6 - Gray
  'exit'       // #E74C3C - Red
] as const;

export type StartupStage = typeof STARTUP_STAGES[number];

// NocoDB color mapping for stages
export const STAGE_COLORS: Record<StartupStage, string> = {
  'idea': '#9B59B6',
  'validation': '#3498DB',
  'mvp': '#E67E22',
  'launch': '#2ECC71',
  'distribution': '#1ABC9C',
  'pmf': '#F39C12',
  'support': '#95A5A6',
  'exit': '#E74C3C'
};

// Check if DB connection is healthy
export async function isDatabaseHealthy(): Promise<boolean> {
  if (!prisma) return false;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[DB] Health check failed:', error);
    return false;
  }
}

// Initialize database with default agents if they don't exist
export async function initializeDatabase(): Promise<void> {
  if (!prisma) {
    console.log('[DB] Skipping database initialization - running without database');
    return;
  }
  
  try {
    // Seed default factory agents
    const agents = [
      {
        name: 'ceo',
        displayName: 'Nanachi',
        role: 'coordinator',
        systemPrompt: 'You are the CEO of Yev\'s AI Startup Factory. You coordinate the factory operations and delegate tasks to the CTO and CMO.'
      },
      {
        name: 'cto',
        displayName: 'Hermes',
        role: 'technologist',
        systemPrompt: 'You are the CTO of Yev\'s AI Startup Factory. You handle all technical execution, deployment, and architecture decisions.'
      },
      {
        name: 'cmo',
        displayName: '工場参谋',
        role: 'marketer',
        systemPrompt: 'You are the CMO of Yev\'s AI Startup Factory. You handle marketing, content, social media, and growth strategies.'
      }
    ];

    for (const agent of agents) {
      await prisma.agent.upsert({
        where: { name: agent.name },
        update: {},
        create: agent
      });
    }

    console.log('[DB] Database initialized with default agents');
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
  }
}

export default prisma;
