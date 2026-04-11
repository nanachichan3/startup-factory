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

  // Seed sample startups
  const startups = [
    {
      name: 'AI Fractional CTO',
      description: 'AI-powered fractional CTO service for startups - provides technical leadership on-demand',
      founderBrief: 'Yev Rachkovan - self-taught fractional CTO looking to productize his expertise',
      stage: 'idea' as const
    },
    {
      name: 'Self-Degree Framework',
      description: 'A book and framework for self-directed education - proving unconventional learning paths work',
      founderBrief: 'Yev\'s passion project - proof that self-directed learning produces results',
      stage: 'mvp' as const
    },
    {
      name: 'DnDate',
      description: 'Dating app through role-playing - making dating fun and less awkward',
      founderBrief: 'Innovative dating platform using gamification and role-play mechanics',
      stage: 'validation' as const
    }
  ];

  for (const startup of startups) {
    const created = await prisma.startup.create({
      data: startup
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

  // Seed sample artifacts for the AI Fractional CTO startup
  const aiFractionalStartup = await prisma.startup.findFirst({
    where: { name: 'AI Fractional CTO' }
  });

  if (aiFractionalStartup) {
    await prisma.artifact.create({
      data: {
        startupId: aiFractionalStartup.id,
        type: 'mvp_spec',
        title: 'MVP Specification - AI Fractional CTO',
        content: '# MVP Spec: AI Fractional CTO\n\n## Core Features\n1. AI Chat Interface for technical advice\n2. Code Review Agent\n3. Architecture Decision Helper\n4. Technical Roadmap Generator\n\n## Tech Stack\n- Frontend: Next.js\n- Backend: Express + Prisma\n- LLM: OpenRouter (Claude/GPT)\n- Deployment: Coolify\n\n## Timeline\n- Week 1-2: Core chat interface\n- Week 3-4: Code review integration\n- Week 5-6: Architecture helper\n- Week 7-8: Public launch',
        agentRole: 'cto',
        iteration: 1
      }
    });

    await prisma.artifact.create({
      data: {
        startupId: aiFractionalStartup.id,
        type: 'gtm_strategy',
        title: 'Go-To-Market Strategy - AI Fractional CTO',
        content: '# GTM Strategy: AI Fractional CTO\n\n## Target Market\n- Solo founders with technical gaps\n- Early stage startups (< 5 people\n- Non-technical co-founders\n\n## Channels\n1. Indie Hackers community\n2. Product Hunt launch\n3. Twitter/X personal branding\n4. Y Combinator founder network\n\n## Pricing (MVP)\n- Free tier: 5 questions/month\n- Pro: $49/month unlimited\n- Team: $149/month',
        agentRole: 'cmo',
        iteration: 1
      }
    });

    console.log(`  ✓ Artifacts created for ${aiFractionalStartup.name}`);
  }

  console.log('\n✅ Seeding complete!\n');
  console.log('Database contains:');
  console.log(`  - ${await prisma.agent.count()} agents`);
  console.log(`  - ${await prisma.startup.count()} startups`);
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
