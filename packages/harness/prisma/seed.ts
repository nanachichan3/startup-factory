import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid startup stages
const STAGES = [
  'idea',      // #9B59B6 - Purple
  'validation', // #3498DB - Blue
  'mvp',       // #E67E22 - Orange
  'launch',    // #2ECC71 - Green
  'distribution', // #1ABC9C - Teal
  'pmf',       // #F39C12 - Yellow
  'support',   // #95A5A6 - Gray
  'exit'       // #E74C3C - Red
] as const;

// All tasks from TASK_BREAKDOWN.md
const TASKS = [
  // PHASE 0
  { title: 'Task 0.1: Add TODO table to Prisma schema', description: 'Add model Task to schema.prisma with id, title, description, priority, status, assignee, phase, estimate_minutes, created_at, updated_at', priority: 'high', phase: 'phase0', estimateMinutes: 15 },
  { title: 'Task 0.2: Seed all tasks into DB', description: 'Seed all tasks from TASK_BREAKDOWN.md into the Task table', priority: 'high', phase: 'phase0', estimateMinutes: 15 },
  // PHASE 1
  { title: 'Task 1.1: Deploy and connect Mem0', description: 'Deploy Mem0 to Coolify, add env vars, wire into agent memory system, verify with curl', priority: 'critical', phase: 'phase1', estimateMinutes: 30 },
  { title: 'Task 1.2: Wire Temporal workflows to real execution', description: 'Fix TEMPORAL_ADDRESS, verify namespace accessible, test POST /api/startups/:id/execute triggers real workflow', priority: 'critical', phase: 'phase1', estimateMinutes: 30 },
  { title: 'Task 1.3: Deploy MiroFish for Swarm Intelligence', description: 'Deploy MiroFish to Coolify, wire swarm endpoint to stage-gate evaluation, test swarm evaluation', priority: 'high', phase: 'phase1', estimateMinutes: 30 },
  { title: 'Task 1.4: Add Prometheus + Grafana observability', description: 'Add prom-client, expose /metrics, deploy prometheus + grafana via dockercompose, create dashboard JSON', priority: 'medium', phase: 'phase1', estimateMinutes: 30 },
  // PHASE 2
  { title: 'Task 2.1: Configure 30-min heartbeat scheduler', description: 'Add cron job every 30 mins, CEO checks unassigned tasks, spawns sub-agents, updates status', priority: 'critical', phase: 'phase2', estimateMinutes: 20 },
  { title: 'Task 2.2: Wire Expert Loops to Temporal (CEO loop)', description: 'Make LangGraph nodes execute as Temporal activities, wire Listen→Decide→Delegate→Validate→Persist→Reflect', priority: 'critical', phase: 'phase2', estimateMinutes: 30 },
  { title: 'Task 2.3: Wire CTO Task Execution Pipeline', description: 'CTO receives tasks from CEO via A2A, spawns sub-agents for tech tasks, reports back on completion', priority: 'high', phase: 'phase2', estimateMinutes: 30 },
  { title: 'Task 2.4: Wire CMO Content Engine Loop', description: 'CMO receives tasks from CEO via A2A, executes Content Engine workflow (daily growth loop)', priority: 'high', phase: 'phase2', estimateMinutes: 30 },
  { title: 'Task 2.5: Add task selection + reporting logic to CEO', description: 'CEO queries DB for unassigned tasks (priority=high/critical first), assigns to CTO/CMO, updates status on completion', priority: 'critical', phase: 'phase2', estimateMinutes: 30 },
  // PHASE 3
  { title: 'Task 3.1: Integrate Postbridge (social scheduling)', description: 'Get Postbridge API credentials, add to CMO agent, wire to social media scheduling workflow, test', priority: 'medium', phase: 'phase3', estimateMinutes: 30 },
  { title: 'Task 3.2: Integrate Apify scraping', description: 'Deploy Apify actor to Coolify, add to CTO agent, wire to competitor research workflow, test scraping 10 competitors', priority: 'medium', phase: 'phase3', estimateMinutes: 30 },
  { title: 'Task 3.3: Integrate Stripe (financial)', description: 'Add Stripe skill to CEO agent, wire to PMF/Exit stage financial tracking', priority: 'low', phase: 'phase3', estimateMinutes: 20 },
  { title: 'Task 3.4: Integrate Docuseal (legal)', description: 'Add Docuseal skill to CEO agent, wire to contract generation for Exit stage', priority: 'low', phase: 'phase3', estimateMinutes: 20 },
  // PHASE 4
  { title: 'Task 4.1: Run E2E test — Full startup lifecycle', description: 'Create test startup via API, trigger workflow execution, verify: Tech Architecture doc (CTO), GTM strategy (CMO), stage advances', priority: 'critical', phase: 'phase4', estimateMinutes: 30 },
  { title: 'Task 4.2: E2E test — Swarm evaluation', description: 'Take startup in Validation stage, trigger swarm intelligence evaluation, verify MiroFish returns score + stage gate passes/fails', priority: 'critical', phase: 'phase4', estimateMinutes: 30 },
  { title: 'Task 4.3: E2E test — Multi-agent coordination', description: 'CEO assigns 3 tasks simultaneously (CTO × 2, CMO × 1), verify all execute in parallel, report back, artifacts stored', priority: 'high', phase: 'phase4', estimateMinutes: 30 },
  { title: 'Task 4.4: E2E test — Fail tolerance', description: 'Kill running Temporal workflow mid-execution, verify workflow restarts and picks up from last checkpoint, no data loss', priority: 'high', phase: 'phase4', estimateMinutes: 30 },
  { title: 'Task 4.5: Build verification dashboard', description: 'Add /api/dashboard/tests endpoint, show pass/fail history, agent execution metrics, startup stage progression timeline', priority: 'medium', phase: 'phase4', estimateMinutes: 30 },
  // PHASE 5
  { title: 'Task 5.1: Audit OpenClaw dependencies', description: 'List all OpenClaw-specific skills/tools, map to equivalent standalone tool, document migration path, commit to docs/migration.md', priority: 'medium', phase: 'phase5', estimateMinutes: 30 },
  { title: 'Task 5.2: Build standalone CEO agent (no OpenClaw)', description: 'Extract CEO logic, build standalone Node.js agent with Temporal + LangGraph, test CEO receives task → executes → reports', priority: 'high', phase: 'phase5', estimateMinutes: 30 },
  { title: 'Task 5.3: Build standalone CTO agent (no OpenClaw)', description: 'Extract CTO logic, build standalone Node.js agent with Temporal + LangGraph, test CTO receives task → executes → reports', priority: 'high', phase: 'phase5', estimateMinutes: 30 },
  { title: 'Task 5.4: Build standalone CMO agent (no OpenClaw)', description: 'Extract CMO logic, build standalone Node.js agent with Temporal + LangGraph, test CMO receives task → executes → reports', priority: 'high', phase: 'phase5', estimateMinutes: 30 },
  { title: 'Task 5.5: Full OpenClaw cutover', description: 'Point all agent references to new standalone agents, remove OpenClaw agent configs, update factory dashboard, verify all agents respond', priority: 'medium', phase: 'phase5', estimateMinutes: 30 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed factory agents
  const agents = [
    {
      name: 'ceo',
      displayName: 'Nanachi',
      role: 'coordinator',
      systemPrompt: 'You are the CEO of Yev\'s AI Startup Factory. You coordinate the factory operations and delegate tasks to the CTO and CMO. You think in systems and optimize for outcomes.'
    },
    {
      name: 'cto',
      displayName: 'Hermes',
      role: 'technologist',
      systemPrompt: 'You are the CTO of Yev\'s AI Startup Factory. You handle all technical execution, deployment, and architecture decisions. You specialize in Coolify, code, infrastructure, and video production pipelines.'
    },
    {
      name: 'cmo',
      displayName: '工場参谋',
      role: 'marketer',
      systemPrompt: 'You are the CMO of Yev\'s AI Startup Factory. You handle marketing, content, social media, and growth strategies. You specialize in content strategy, Postiz, and brand voice.'
    }
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { name: agent.name },
      update: {},
      create: agent
    });
    console.log(`  ✓ Agent: ${agent.displayName} (${agent.role})`);
  }

  // Seed all tasks from TASK_BREAKDOWN.md using raw SQL (avoids Prisma client issues)
  console.log('\n📋 Seeding tasks...');
  for (const task of TASKS) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "tasks" (id, title, description, priority, status, phase, estimate_minutes, created_at, updated_at)
      SELECT 
        'task_' || substr(md5(random()::text), 1, 12) || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
        $1::text,
        $2::text,
        $3::text,
        'todo'::text,
        $4::text,
        $5::int,
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "tasks" WHERE title = $1::text)
    `, task.title, task.description, task.priority, task.phase, task.estimateMinutes);
  }
  console.log(`  ✓ ${TASKS.length} tasks seeded`);

  // Seed sample startups
  const startups = [
    {
      name: 'DnDate',
      description: 'Dating app through role-playing - making dating fun and less awkward',
      founderBrief: 'Innovative dating platform using gamification and role-play mechanics',
      stage: 'validation' as const
    },
    {
      name: 'Self-Degree Framework',
      description: 'A book and framework for self-directed education - proving unconventional learning paths work',
      founderBrief: 'Yev\'s passion project - proof that self-directed learning produces results',
      stage: 'mvp' as const
    },
    {
      name: 'AI Code Review',
      description: 'AI-powered code review tool that provides context-aware feedback and improvement suggestions',
      founderBrief: 'Yev\'s technical expertise applied to solving developer productivity',
      stage: 'idea' as const
    }
  ];

  for (const startup of startups) {
    const created = await prisma.startup.upsert({
      where: { id: startup.name },
      update: {},
      create: {
        id: startup.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        ...startup
      }
    });

    // Create initial lifecycle event
    await prisma.lifecycleEvent.create({
      data: {
        startupId: created.id,
        fromStage: null,
        toStage: created.stage,
        eventType: 'created',
        metadata: { name: created.name, seeded: true }
      }
    });

    console.log(`  ✓ Startup: ${created.name} (${created.stage})`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('Database contains:');
  console.log(`  - ${await prisma.agent.count()} agents`);
  console.log(`  - ${await prisma.startup.count()} startups`);
  console.log(`  - ${await prisma.task.count()} tasks`);
  console.log(`  - ${await prisma.artifact.count()} artifacts`);
  console.log(`  - ${await prisma.lifecycleEvent.count()} lifecycle events`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
