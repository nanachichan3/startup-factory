import { Request, Response } from 'express';
import { prisma, STARTUP_STAGES, isDatabaseHealthy, initializeDatabase } from '../../db/client.js';
import { temporalCloud } from '../../temporal/cloud.js';


// In-memory storage for demo mode (when no database is available)
interface DemoStartup {
  id: string;
  name: string;
  description: string;
  founderBrief: string;
  stage: string;
  currentWorkflowId: string | null;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
}

const demoStore: Map<string, DemoStartup> = new Map();
const demoList: DemoStartup[] = [];

// Initialize database on module load
initializeDatabase().catch(console.error);

// Demo mode check

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

    const validStage = (stage && STARTUP_STAGES.includes(stage) ? stage : 'idea');

    if (!prisma) {
      // Demo mode - use in-memory storage
      const startup: DemoStartup = {
        id: `startup-${Date.now()}`,
        name,
        description,
        founderBrief: founderBrief || '',
        stage: validStage,
        currentWorkflowId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastExecutedAt: null
      };
      
      demoStore.set(startup.id, startup);
      demoList.push(startup);
      
      console.log(`[API] Created startup (demo): ${startup.id} - ${startup.name}`);
      res.status(201).json(startup);
      return;
    }

    // Use raw SQL to bypass Prisma enum validation
    const startupId = `startup-${Date.now()}`;
    await prisma.$executeRaw`
      INSERT INTO "Startup" (id, name, description, "founderBrief", stage, "createdAt", "updatedAt")
      VALUES (${startupId}, ${name}, ${description}, ${founderBrief || ''}, ${validStage}, NOW(), NOW())
    `;
    const startup = { id: startupId, name, description, founderBrief: founderBrief || '', stage: validStage };

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
    if (!prisma) {
      res.json({ 
        startups: demoList, 
        count: demoList.length,
        stages: STARTUP_STAGES,
        mode: 'demo'
      });
      return;
    }

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

    if (!prisma) {
      const startup = demoStore.get(id);
      if (startup) {
        res.json(startup);
        return;
      }
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

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

    if (!prisma) {
      const startup = demoStore.get(id);
      if (!startup) {
        res.status(404).json({ error: 'Startup not found' });
        return;
      }
      
      const previousStage = startup.stage;
      startup.stage = stage;
      startup.updatedAt = new Date().toISOString();
      
      console.log(`[API] Updated startup ${id} stage (demo): ${previousStage} -> ${stage}`);
      res.json(startup);
      return;
    }

    // Get current startup to record transition
    const currentStartup = await prisma.startup.findUnique({ where: { id } });
    if (!currentStartup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    const previousStage = currentStartup.stage;
    const enumNewStage = stage;

    // Update startup
    const startup = await prisma.startup.update({
      where: { id },
      data: { stage: enumNewStage }
    });

    // Record lifecycle event
    await prisma.lifecycleEvent.create({
      data: {
        startupId: id,
        fromStage: previousStage,
        toStage: enumNewStage,
        eventType: 'stage_advance',
        metadata: { previousStage, newStage: enumNewStage }
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

    let startup: any;
    
    if (!prisma) {
      startup = demoStore.get(id);
      if (!startup) {
        res.status(404).json({ error: 'Startup not found' });
        return;
      }
    } else {
      startup = await prisma.startup.findUnique({ where: { id } });
      if (!startup) {
        res.status(404).json({ error: 'Startup not found' });
        return;
      }
    }

    // Check if Temporal is connected
    if (!temporalCloud.isReady()) {
      // Fallback: simulate workflow execution without Temporal
      console.log(`[API] Temporal not connected - simulating workflow for startup ${id}`);

      const workflowId = `simulated-${Date.now()}`;

      if (prisma) {
        // Record workflow run in database
        await prisma.workflowRun.create({
          data: {
            workflowId,
            startupId: id,
            type: 'factory',
            status: 'completed',
            input: {
              projectName: startup.name,
              projectDescription: startup.description,
              initialStage: startup.stage,
              founderBrief: startup.founderBrief
            },
            output: { message: 'Workflow simulation completed successfully' },
            completedAt: new Date()
          }
        });

        // Create lifecycle event
        await prisma.lifecycleEvent.create({
          data: {
            startupId: id,
            fromStage: null,
            toStage: startup.stage,
            eventType: 'workflow_start',
            metadata: { workflowId, simulated: true }
          }
        });

        // Update startup
        await prisma.startup.update({
          where: { id },
          data: { 
            currentWorkflowId: workflowId,
            lastExecutedAt: new Date()
          }
        });
      } else {
        // Demo mode - update in-memory
        startup.currentWorkflowId = workflowId;
        startup.lastExecutedAt = new Date().toISOString();
      }

      res.json({ 
        startupId: id, 
        workflowId,
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

    if (prisma) {
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

      // Update startup
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
    } else {
      startup.currentWorkflowId = workflowId;
      startup.lastExecutedAt = new Date().toISOString();
    }

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

  const status = dbHealthy ? 'ok' : 'ok'; // Still ok if DB is down (demo mode)

  res.json({ 
    status, 
    service: 'startup-factory-api',
    timestamp: new Date().toISOString(),
    mode: (!prisma || !(await isDatabaseHealthy())) ? 'demo' : 'production',
    dependencies: {
      database: dbHealthy ? 'connected' : 'disconnected (demo mode)',
      temporal: temporalReady ? 'connected' : 'disconnected'
    }
  });
}
