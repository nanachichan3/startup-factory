import { Request, Response } from 'express';
import { prisma, STARTUP_STAGES, isDatabaseHealthy, initializeDatabase } from '../../db/client.js';
import { temporalCloud } from '../../temporal/cloud.js';

// Initialize database on module load
initializeDatabase().catch(console.error);

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

    // Validate stage if provided
    const validStage = stage && STARTUP_STAGES.includes(stage) ? stage : 'idea';

    const startup = await prisma.startup.create({
      data: {
        name,
        description,
        founderBrief: founderBrief || '',
        stage: validStage
      }
    });

    // Create initial lifecycle event
    await prisma.lifecycleEvent.create({
      data: {
        startupId: startup.id,
        fromStage: null,
        toStage: startup.stage,
        eventType: 'created',
        metadata: { name: startup.name }
      }
    });

    console.log(`[API] Created startup: ${startup.id} - ${startup.name}`);
    res.status(201).json(startup);
  } catch (error) {
    console.error('[API] Error creating startup:', error);
    res.status(500).json({ error: 'Failed to create startup' });
  }
}

/**
 * GET /api/startups
 * List all startups
 */
export async function listStartups(_req: Request, res: Response): Promise<void> {
  try {
    const startups = await prisma.startup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { artifacts: true, lifecycleEvents: true }
        }
      }
    });

    res.json({ 
      startups, 
      count: startups.length,
      stages: STARTUP_STAGES
    });
  } catch (error) {
    console.error('[API] Error listing startups:', error);
    res.status(500).json({ error: 'Failed to list startups' });
  }
}

/**
 * GET /api/startups/:id
 * Get a specific startup
 */
export async function getStartup(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const startup = await prisma.startup.findUnique({
      where: { id },
      include: {
        artifacts: { orderBy: { createdAt: 'desc' } },
        lifecycleEvents: { orderBy: { createdAt: 'desc' } },
        agentAssignments: {
          include: { agent: true }
        }
      }
    });

    if (!startup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    res.json(startup);
  } catch (error) {
    console.error('[API] Error getting startup:', error);
    res.status(500).json({ error: 'Failed to get startup' });
  }
}

/**
 * PUT /api/startups/:id/stage
 * Update startup stage
 */
export async function updateStartupStage(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { stage } = req.body;

    if (!stage) {
      res.status(400).json({ error: 'stage is required' });
      return;
    }

    if (!STARTUP_STAGES.includes(stage)) {
      res.status(400).json({ 
        error: `Invalid stage. Must be one of: ${STARTUP_STAGES.join(', ')}` 
      });
      return;
    }

    // Get current startup to record transition
    const currentStartup = await prisma.startup.findUnique({ where: { id } });
    if (!currentStartup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    const previousStage = currentStartup.stage;

    // Update startup
    const startup = await prisma.startup.update({
      where: { id },
      data: { stage }
    });

    // Record lifecycle event
    await prisma.lifecycleEvent.create({
      data: {
        startupId: id,
        fromStage: previousStage,
        toStage: stage,
        eventType: 'stage_advance',
        metadata: { previousStage, newStage: stage }
      }
    });

    console.log(`[API] Updated startup ${id} stage: ${previousStage} -> ${stage}`);
    res.json(startup);
  } catch (error) {
    console.error('[API] Error updating startup stage:', error);
    res.status(500).json({ error: 'Failed to update startup stage' });
  }
}

/**
 * POST /api/startups/:id/execute
 * Trigger the expert loop workflow for a startup
 */
export async function executeWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const startup = await prisma.startup.findUnique({ where: { id } });
    if (!startup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    // Check if Temporal is connected
    if (!temporalCloud.isReady()) {
      // Fallback: simulate workflow execution without Temporal
      console.log(`[API] Temporal not connected - simulating workflow for startup ${id}`);

      // Create a simulated workflow run
      const workflowRun = await prisma.workflowRun.create({
        data: {
          workflowId: `simulated-${Date.now()}`,
          startupId: id,
          type: 'factory',
          status: 'running',
          input: {
            projectName: startup.name,
            projectDescription: startup.description,
            initialStage: startup.stage,
            founderBrief: startup.founderBrief
          }
        }
      });

      // Update startup with workflow ID
      await prisma.startup.update({
        where: { id },
        data: { 
          currentWorkflowId: workflowRun.workflowId,
          lastExecutedAt: new Date()
        }
      });

      // Create lifecycle event
      await prisma.lifecycleEvent.create({
        data: {
          startupId: id,
          fromStage: null,
          toStage: startup.stage,
          eventType: 'workflow_start',
          metadata: { workflowId: workflowRun.workflowId, simulated: true }
        }
      });

      // Complete the workflow immediately (simulation)
      await prisma.workflowRun.update({
        where: { id: workflowRun.id },
        data: { 
          status: 'completed',
          completedAt: new Date(),
          output: { message: 'Workflow simulation completed successfully' }
        }
      });

      res.json({ 
        startupId: id, 
        workflowId: workflowRun.workflowId,
        status: 'simulated',
        message: 'Expert loop workflow simulated (Temporal not connected)'
      });
      return;
    }

    // Start the workflow with Temporal
    const workflowId = await temporalCloud.startWorkflow({
      projectName: startup.name,
      projectDescription: startup.description,
      initialStage: startup.stage,
      founderBrief: startup.founderBrief,
    });

    // Record workflow run
    await prisma.workflowRun.create({
      data: {
        workflowId,
        startupId: id,
        type: 'factory',
        status: 'running',
        input: {
          projectName: startup.name,
          projectDescription: startup.description,
          initialStage: startup.stage
        }
      }
    });

    // Update startup with workflow ID
    await prisma.startup.update({
      where: { id },
      data: { 
        currentWorkflowId: workflowId,
        lastExecutedAt: new Date()
      }
    });

    // Create lifecycle event
    await prisma.lifecycleEvent.create({
      data: {
        startupId: id,
        fromStage: null,
        toStage: startup.stage,
        eventType: 'workflow_start',
        metadata: { workflowId }
      }
    });

    console.log(`[API] Started workflow ${workflowId} for startup ${id}`);
    res.json({ 
      startupId: id, 
      workflowId,
      status: 'started',
      message: 'Expert loop workflow started successfully'
    });
  } catch (error) {
    console.error('[API] Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
}

/**
 * GET /api/health
 * Health check endpoint
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const dbHealthy = await isDatabaseHealthy();
  const temporalReady = temporalCloud.isReady();

  const status = dbHealthy ? 'ok' : 'degraded';

  res.json({ 
    status, 
    service: 'startup-factory-api',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: dbHealthy ? 'connected' : 'disconnected',
      temporal: temporalReady ? 'connected' : 'disconnected'
    }
  });
}
