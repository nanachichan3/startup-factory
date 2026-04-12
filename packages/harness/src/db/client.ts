import { PrismaClient } from '@prisma/client';

// Singleton Prisma client for the harness
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Check if DATABASE_URL is configured
const dbUrl = process.env.DATABASE_URL || '';
const hasDatabaseUrl = dbUrl && 
  !dbUrl.includes('placeholder') &&
  (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));

// Create Prisma client only if DATABASE_URL is valid
let prisma: PrismaClient | null = null;

if (hasDatabaseUrl) {
  console.log('[DB] DATABASE_URL configured:', dbUrl.replace(/:[^:@]+@/, ':****@'));
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
    // First, try to create tables using raw SQL (bypasses migration_lock.toml issues)
    const createEnums = `
      DO $$ BEGIN
        CREATE TYPE "LifecycleStage" AS ENUM ('Ideation', 'Validation', 'Prototype', 'MVP', 'Growth', 'Scale', 'Optimize', 'Exit');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE "AgentStatus" AS ENUM ('active', 'inactive');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE "WorkflowStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `;
    await prisma.$executeRawUnsafe(createEnums);
    
    // Create tables if they don't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "startups" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "founderBrief" TEXT NOT NULL DEFAULT '',
        "stage" "LifecycleStage" NOT NULL DEFAULT 'Ideation',
        "currentWorkflowId" TEXT,
        "lastExecutedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "artifacts" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "startupId" TEXT NOT NULL REFERENCES "startups"("id") ON DELETE CASCADE,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "agentRole" TEXT,
        "iteration" INTEGER NOT NULL DEFAULT 1,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "lifecycle_events" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "startupId" TEXT NOT NULL REFERENCES "startups"("id") ON DELETE CASCADE,
        "fromStage" "LifecycleStage",
        "toStage" "LifecycleStage" NOT NULL,
        "eventType" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "agents" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "displayName" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "systemPrompt" TEXT NOT NULL,
        "status" "AgentStatus" NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "agent_assignments" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON UPDATE CASCADE,
        "startupId" TEXT NOT NULL REFERENCES "startups"("id") ON DELETE CASCADE,
        "stage" "LifecycleStage" NOT NULL,
        "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
        "notes" TEXT,
        "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        UNIQUE("agentId", "startupId", "stage")
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "agent_messages" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "senderId" TEXT NOT NULL REFERENCES "agents"("id") ON UPDATE CASCADE,
        "recipientId" TEXT NOT NULL REFERENCES "agents"("id") ON UPDATE CASCADE,
        "type" TEXT NOT NULL,
        "payload" JSONB NOT NULL,
        "workflowId" TEXT,
        "runId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "workflow_runs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workflowId" TEXT NOT NULL,
        "startupId" TEXT NOT NULL REFERENCES "startups"("id") ON DELETE CASCADE,
        "type" TEXT NOT NULL,
        "status" "WorkflowStatus" NOT NULL DEFAULT 'running',
        "input" JSONB,
        "output" JSONB,
        "error" TEXT,
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        UNIQUE("workflowId")
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "startupId" TEXT NOT NULL REFERENCES "startups"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);
    
    console.log('[DB] Schema created via raw SQL');

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
  } catch (error: any) {
    // If raw SQL schema creation fails, try just upserting agents
    // (tables might already exist)
    try {
      const agents = [
        { name: 'ceo', displayName: 'Nanachi', role: 'coordinator', systemPrompt: 'You are the CEO.' },
        { name: 'cto', displayName: 'Hermes', role: 'technologist', systemPrompt: 'You are the CTO.' },
        { name: 'cmo', displayName: '工場参谋', role: 'marketer', systemPrompt: 'You are the CMO.' }
      ];
      for (const agent of agents) {
        await prisma!.agent.upsert({
          where: { name: agent.name },
          update: {},
          create: agent
        });
      }
      console.log('[DB] Agents upserted (schema already exists)');
    } catch (e2) {
      console.error('[DB] All DB initialization failed:', error?.message || error, '| Agent upsert also failed:', e2?.message || e2);
    }
  }
}

export default prisma;
