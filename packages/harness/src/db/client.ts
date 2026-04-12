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
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "priority" TEXT NOT NULL DEFAULT 'medium',
        "status" TEXT NOT NULL DEFAULT 'todo',
        "assignee" TEXT,
        "phase" TEXT NOT NULL DEFAULT 'phase1',
        "estimateMinutes" INTEGER NOT NULL DEFAULT 30,
        "workflowRunId" TEXT,
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

    // === Seed sample startups ===
    console.log('[DB] About to count startups...');
    try {
      const startupCount = await prisma.startup.count();
      console.log('[DB] Current startups count:', startupCount);
      const forceSeed = process.env.SEED_DATABASE === '1';
      if (startupCount === 0 || forceSeed) {
        console.log('[DB] About to insert startup seed data...');
        await prisma.$executeRawUnsafe(`
          INSERT INTO "startups" (id, name, description, "founderBrief", stage, "createdAt", "updatedAt")
          VALUES 
            ('startup-dndate', 'DnDate', 'Dating app through role-playing', 'Yev Rachkovan', 'Validation', NOW(), NOW()),
            ('startup-selfdegree', 'Self-Degree Framework', 'Book and movement on self-directed education', 'Yev Rachkovan', 'MVP', NOW(), NOW()),
            ('startup-aicodereview', 'AI Code Review Assistant', 'AI-powered code review tool for startup teams', 'Yev Rachkovan', 'Ideation', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('[DB] Sample startups seeded');
      } else {
        console.log('[DB] Startups already exist (' + startupCount + '), skipping seed');
      }
    } catch (err) {
      console.error('[DB] Startup seeding error:', err);
    }

    // === Seed sample tasks ===
    console.log('[DB] Checking if task seed is needed...');
    try {
      const taskCount = await prisma.task.count();
      console.log('[DB] Current tasks count:', taskCount);
      if (taskCount === 0) {
        console.log('[DB] About to insert task seed data...');
        await prisma.$executeRawUnsafe(`
          INSERT INTO "tasks" (id, title, description, priority, status, assignee, phase, "estimateMinutes", "createdAt", "updatedAt")
          VALUES 
            ('task-001', 'Define DnDate core value proposition', 'Identify the unique angle: role-playing dating. Target users who want more authentic connections.', 'high', 'in_progress', 'ceo', 'phase1', 60, NOW(), NOW()),
            ('task-002', 'Create DnDate MVP scope document', 'Outline must-have features for role-playing dating MVP: profiles, role scenarios, matching.', 'high', 'todo', 'cto', 'phase1', 45, NOW(), NOW()),
            ('task-003', 'Design DnDate user onboarding flow', 'Map out the experience from signup to first role-play date.', 'medium', 'todo', 'cmo', 'phase1', 30, NOW(), NOW()),
            ('task-004', 'Build DnDate user profile system', 'Create profile structure supporting role-play preferences and personality tags.', 'high', 'todo', 'cto', 'phase2', 120, NOW(), NOW()),
            ('task-005', 'Develop DnDate matching algorithm', 'Build compatibility scoring based on role-play style and relationship goals.', 'high', 'todo', 'cto', 'phase2', 180, NOW(), NOW()),
            ('task-006', 'Write Self-Degree Chapter 1 draft', 'Complete first chapter on the philosophy of self-directed education.', 'high', 'completed', 'ceo', 'phase1', 120, NOW(), NOW()),
            ('task-007', 'Design Self-Degree book cover concept', 'Create visual identity for the book and accompanying movement.', 'medium', 'in_progress', 'cmo', 'phase1', 60, NOW(), NOW()),
            ('task-008', 'Plan Self-Degree launch strategy', 'Map out pre-launch community building and early adopter acquisition.', 'medium', 'todo', 'cmo', 'phase2', 90, NOW(), NOW()),
            ('task-009', 'Create Self-Degree reader community', 'Set up community channel for early readers to engage.', 'medium', 'todo', 'cmo', 'phase2', 45, NOW(), NOW()),
            ('task-010', 'Define AI Code Review tool requirements', 'Document core features: PR integration, inline comments, suggested fixes.', 'high', 'todo', 'cto', 'phase1', 60, NOW(), NOW()),
            ('task-011', 'Build AI Code Review MVP', 'Create a CLI tool that accepts a diff and returns AI-powered review comments.', 'high', 'todo', 'cto', 'phase2', 240, NOW(), NOW()),
            ('task-012', 'Integrate AI Code Review with GitHub Actions', 'Build GitHub Action workflow for automated code review on PRs.', 'high', 'todo', 'cto', 'phase2', 120, NOW(), NOW()),
            ('task-013', 'Write AI Code Review landing page', 'Create marketing page highlighting time savings and quality improvements.', 'medium', 'todo', 'cmo', 'phase3', 60, NOW(), NOW()),
            ('task-014', 'Analyze DnDate competitor landscape', 'Research existing role-playing and niche dating apps.', 'medium', 'completed', 'ceo', 'phase1', 45, NOW(), NOW()),
            ('task-015', 'Draft DnDate monetization model', 'Explore freemium, subscription, and premium feature unlock options.', 'medium', 'todo', 'ceo', 'phase2', 60, NOW(), NOW()),
            ('task-016', 'Set up Self-Degree website', 'Create landing page for the book with newsletter signup.', 'medium', 'in_progress', 'cto', 'phase1', 90, NOW(), NOW()),
            ('task-017', 'Write Self-Degree reader survey', 'Design survey to gather early feedback on book concepts.', 'medium', 'todo', 'ceo', 'phase1', 30, NOW(), NOW()),
            ('task-018', 'Create AI Code Review demo video', 'Record and edit a short demo showing the tool in action.', 'medium', 'todo', 'cmo', 'phase3', 120, NOW(), NOW()),
            ('task-019', 'Draft DnDate pitch deck slide 1-5', 'Create initial slides covering problem, solution, and market opportunity.', 'medium', 'todo', 'ceo', 'phase3', 90, NOW(), NOW()),
            ('task-020', 'Set up DnDate analytics tracking', 'Instrument the app to track user engagement and conversion funnels.', 'medium', 'todo', 'cto', 'phase2', 60, NOW(), NOW()),
            ('task-021', 'Write Self-Degree chapter 2 outline', 'Expand the book structure with chapter 2 on learning ecosystems.', 'medium', 'todo', 'ceo', 'phase2', 45, NOW(), NOW()),
            ('task-022', 'Research AI Code Review pricing models', 'Analyze competitor pricing for similar developer tools.', 'low', 'todo', 'ceo', 'phase2', 45, NOW(), NOW()),
            ('task-023', 'Create DnDate brand guidelines', 'Define voice, tone, and visual identity for the app.', 'low', 'todo', 'cmo', 'phase2', 60, NOW(), NOW()),
            ('task-024', 'Build Self-Degree email course', 'Create 5-email drip sequence to nurture book readers.', 'medium', 'todo', 'cmo', 'phase3', 120, NOW(), NOW()),
            ('task-025', 'Design AI Code Review dashboard', 'Mock up the web dashboard showing review history and team metrics.', 'medium', 'todo', 'cto', 'phase3', 90, NOW(), NOW()),
            ('task-026', 'Write DnDate waitlist landing page', 'Create pre-launch page with email capture.', 'high', 'todo', 'cmo', 'phase2', 60, NOW(), NOW()),
            ('task-027', 'Plan DnDate beta testing program', 'Design beta cohort structure and feedback collection process.', 'medium', 'todo', 'ceo', 'phase3', 90, NOW(), NOW()),
            ('task-028', 'Set up AI Code Review GitHub repository', 'Initialize repo with README, CI, and contribution guidelines.', 'high', 'completed', 'cto', 'phase1', 30, NOW(), NOW()),
            ('task-029', 'Create Self-Degree social media presence', 'Set up Twitter/LinkedIn accounts and first content plan.', 'medium', 'todo', 'cmo', 'phase2', 60, NOW(), NOW()),
            ('task-030', 'Review DnDate technical architecture', 'Audit proposed stack and identify scalability risks.', 'medium', 'todo', 'cto', 'phase2', 90, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('[DB] Sample tasks seeded');
      } else {
        console.log('[DB] Tasks already exist, skipping seed');
      }
    } catch (err) {
      console.error('[DB] Task seeding error:', err);
    }
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
