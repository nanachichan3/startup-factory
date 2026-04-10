import { Request, Response } from 'express';
import { temporalCloud } from '../../temporal/cloud.js';

// In-memory store for when DB is not available
const memoryStore: Map<string, any> = new Map();
const startupList: any[] = [];

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

    const startup = {
      id: `startup-${Date.now()}`,
      name,
      description,
      founderBrief: founderBrief || '',
      stage: stage || 'idea',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    startupList.push(startup);
    memoryStore.set(startup.id, startup);

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
    res.json({ startups: startupList, count: startupList.length });
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

    const startup = memoryStore.get(id);
    if (startup) {
      res.json(startup);
      return;
    }

    res.status(404).json({ error: 'Startup not found' });
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

    const validStages = ['idea', 'gtm', 'mvp', 'launch', 'growth', 'scale'];
    if (!validStages.includes(stage)) {
      res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
      return;
    }

    const startup = memoryStore.get(id);
    if (startup) {
      startup.stage = stage;
      startup.updatedAt = new Date().toISOString();
      res.json(startup);
      return;
    }

    res.status(404).json({ error: 'Startup not found' });
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

    const startup = memoryStore.get(id);
    if (!startup) {
      res.status(404).json({ error: 'Startup not found' });
      return;
    }

    // Check if Temporal is connected
    if (!temporalCloud.isReady()) {
      res.status(503).json({ 
        error: 'Temporal not connected',
        message: 'Please configure TEMPORAL_ADDRESS and TEMPORAL_NAMESPACE environment variables',
        hint: 'Get a free Temporal Cloud namespace at https://cloud.temporal.io'
      });
      return;
    }

    // Start the workflow
    const workflowId = await temporalCloud.startWorkflow({
      projectName: startup.name,
      projectDescription: startup.description,
      initialStage: startup.stage,
      founderBrief: startup.founderBrief,
    });

    // Update startup with workflow ID
    startup.currentWorkflowId = workflowId;
    startup.lastExecutedAt = new Date().toISOString();
    memoryStore.set(id, startup);

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
