import { Request, Response } from 'express';
import { PrismaClient, LifecycleStage } from '@prisma/client';
import { temporalCloud } from '../../temporal/cloud.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const VALID_STAGES = Object.values(LifecycleStage);

// Helper: extract string from Express query param (which is string | string[] | undefined)
const str = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/**
 * POST /api/startups
 * Create a new startup
 */
export async function createStartup(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, founderBrief, stage } = req.body;

    if (!name || !description) {
      res.status(400).json({ error: 'name and description are required' });
      return;
    }

    const stageEnum = stage
      ? (LifecycleStage as any)[stage]
      : LifecycleStage.Ideation;

    if (!VALID_STAGES.includes(stageEnum)) {
      res.status(400).json({
        error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`,
      });
      return;
    }

    const startup = await prisma.startup.create({
      data: {
        name,
        description,
        founderBrief: founderBrief || '',
        stage: stageEnum,
      },
    });

    await prisma.lifecycleEvent.create({
      data: {
        startupId: startup.id,
        fromStage: null,
        toStage: startup.stage,
        eventType: 'startup_created',
        metadata: { name: startup.name, createdBy: 'api' },
      },
    });

    console.log(`[API] Created startup: ${startup.id} - ${startup.name}`);
    res.status(201).json(startup);
  } catch (error: any) {
    console.error('[API] Error creating startup:', error);
    res.status(500).json({ error: 'Failed to create startup', details: error.message });
  }
}

/**
 * GET /api/startups
 * List all startups with optional filters
 */
export async function listStartups(req: Request, res: Response): Promise<void> {
  try {
    const { stage, agent, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (stage) where.stage = stage as LifecycleStage;

    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 50;
    const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

    const startups = await prisma.startup.findMany({
      where,
      include: {
        _count: {
          select: {
            artifacts: true,
            lifecycleEvents: true,
            agentAssignments: true,
            documents: true,
          },
        },
        lifecycleEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        agentAssignments: {
          include: { agent: true },
          where: agent ? { agent: { name: agent as string } } : undefined,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limitNum,
      skip: offsetNum,
    });

    const total = await prisma.startup.count({ where });

    res.json({ startups, count: startups.length, total });
  } catch (error: any) {
    console.error('[API] Error listing startups:', error);
    res.status(500).json({ error: 'Failed to list startups', details: error.message });
  }
}

/**
 * GET /api/startups/:id
 * Get a specific startup with all relations
 */
export async function getStartup(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const startup = await prisma.startup.findUnique({
      where: { id },
      include: {
        artifacts: { orderBy: { createdAt: 'desc' } },
        lifecycleEvents: { orderBy: { createdAt: 'desc' } },
        agentAssignments: { include: { agent: true }, orderBy: { assignedAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!startup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    res.json(startup);
  } catch (error: any) {
    console.error('[API] Error getting startup:', error);
    res.status(500).json({ error: 'Failed to get startup', details: error.message });
  }
}

/**
 * PUT /api/startups/:id/stage
 * Advance startup to a new lifecycle stage
 */
export async function updateStartupStage(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { stage } = req.body;

    if (!stage) {
      res.status(400).json({ error: 'stage is required' });
      return;
    }

    const stageEnum = (LifecycleStage as any)[stage];
    if (!VALID_STAGES.includes(stageEnum)) {
      res.status(400).json({
        error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}`,
      });
      return;
    }

    const current = await prisma.startup.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    const updated = await prisma.startup.update({
      where: { id },
      data: { stage: stageEnum },
    });

    await prisma.lifecycleEvent.create({
      data: {
        startupId: id,
        fromStage: current.stage,
        toStage: stageEnum,
        eventType: 'stage_advance',
        metadata: { previousStage: current.stage, newStage: stageEnum, updatedBy: 'api' },
      },
    });

    console.log(`[API] Startup ${id} stage: ${current.stage} → ${stageEnum}`);
    res.json(updated);
  } catch (error: any) {
    console.error('[API] Error updating startup stage:', error);
    res.status(500).json({ error: 'Failed to update startup stage', details: error.message });
  }
}

/**
 * POST /api/startups/:id/execute
 * Trigger the Temporal expert loop workflow
 */
export async function executeWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const startup = await prisma.startup.findUnique({ where: { id } });
    if (!startup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    if (!temporalCloud.isReady()) {
      res.status(503).json({
        error: 'Temporal not connected',
        message: 'Set TEMPORAL_ADDRESS and TEMPORAL_NAMESPACE environment variables',
        hint: 'Get a free Temporal Cloud namespace at https://cloud.temporal.io',
      });
      return;
    }

    const workflowId = await temporalCloud.startWorkflow({
      projectName: startup.name,
      projectDescription: startup.description,
      initialStage: startup.stage,
      founderBrief: startup.founderBrief,
    });

    await prisma.startup.update({
      where: { id },
      data: {
        currentWorkflowId: workflowId,
        lastExecutedAt: new Date(),
      },
    });

    await prisma.lifecycleEvent.create({
      data: {
        startupId: id,
        fromStage: startup.stage,
        toStage: startup.stage,
        eventType: 'workflow_start',
        metadata: { workflowId, startupName: startup.name },
      },
    });

    console.log(`[API] Started workflow ${workflowId} for startup ${id}`);
    res.json({
      startupId: id,
      workflowId,
      status: 'started',
      message: 'Expert loop workflow started successfully',
    });
  } catch (error: any) {
    console.error('[API] Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow', details: error.message });
  }
}

/**
 * POST /api/startups/:id/artifacts
 * Create an artifact for a startup
 */
export async function createArtifact(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { type, title, content, agentRole, metadata } = req.body;

    if (!type || !title || !content) {
      res.status(400).json({ error: 'type, title, and content are required' });
      return;
    }

    const startup = await prisma.startup.findUnique({ where: { id } });
    if (!startup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    const artifact = await prisma.artifact.create({
      data: {
        startupId: id,
        type,
        title,
        content,
        agentRole: agentRole || null,
        metadata: metadata || null,
      },
    });

    await prisma.lifecycleEvent.create({
      data: {
        startupId: id,
        fromStage: startup.stage,
        toStage: startup.stage,
        eventType: 'artifact_created',
        metadata: { artifactId: artifact.id, artifactType: type, artifactTitle: title },
      },
    });

    console.log(`[API] Created artifact ${artifact.id} for startup ${id}`);
    res.status(201).json(artifact);
  } catch (error: any) {
    console.error('[API] Error creating artifact:', error);
    res.status(500).json({ error: 'Failed to create artifact', details: error.message });
  }
}

/**
 * GET /api/stages
 * List all available lifecycle stages with colors
 */
export async function listStages(_req: Request, res: Response): Promise<void> {
  const stages = [
    { value: 'Ideation',   color: '#8888ff', description: 'Problem definition and brainstorming' },
    { value: 'Validation',  color: '#ffaa00', description: 'Customer interviews and market demand' },
    { value: 'Prototype',  color: '#ff8800', description: 'Build and test core functionality' },
    { value: 'MVP',        color: '#00cc66', description: 'Launch to early adopters' },
    { value: 'Growth',     color: '#00aaee', description: 'Scale acquisition channels' },
    { value: 'Scale',      color: '#aa44ff', description: 'Expand market reach and team' },
    { value: 'Optimize',   color: '#ff4488', description: 'Maximize LTV, minimize CAC' },
    { value: 'Exit',       color: '#666666', description: 'Prepare for liquidity event' },
  ];
  res.json({ stages });
}

// Graceful Prisma shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
