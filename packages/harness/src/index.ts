import { Connection, WorkflowClient } from '@temporalio/client';
import { factoryActivities } from './workflows/activities.js';
import { runStartupFactoryWorkflow } from './workflows/factory-workflow.js';
import { runExpertLoopGraph } from './graph/expert-loop-graph.js';
import { A2AProtocolHandler, createA2AHandler } from './protocol/a2a-handler.js';
import { TemporalCloudProvider, temporalCloud } from './temporal/cloud.js';
import app from './api/server.js';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'default';
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

/**
 * Startup Factory Harness - Main Entry Point
 * 
 * This harness orchestrates:
 * - Temporal.io for workflow orchestration (Cloud or self-hosted)
 * - Langgraph for the Universal Expert Loop
 * - A2A Protocol for agent communication
 * - Express.js for HTTP API
 */
class StartupFactoryHarness {
  private temporalConnection: Connection | null = null;
  private workflowClient: WorkflowClient | null = null;
  private a2aHandlers: Map<string, A2AProtocolHandler> = new Map();
  private temporalCloudProvider: TemporalCloudProvider;

  constructor() {
    this.temporalCloudProvider = temporalCloud;
  }

  async initialize(): Promise<void> {
    console.log('[Harness] Initializing Startup Factory Harness...');

    // Try to connect to Temporal (Cloud or self-hosted)
    await this.initializeTemporal();

    // Initialize A2A handlers for each agent role
    this.a2aHandlers.set('ceo', createA2AHandler('ceo'));
    this.a2aHandlers.set('cto', createA2AHandler('cto'));
    this.a2aHandlers.set('cmo', createA2AHandler('cmo'));

    console.log('[Harness] A2A handlers initialized for CEO, CTO, CMO');
  }

  private async initializeTemporal(): Promise<void> {
    // Check for Temporal Cloud configuration first
    if (process.env.TEMPORAL_ADDRESS && process.env.TEMPORAL_NAMESPACE) {
      console.log('[Harness] Temporal Cloud configuration detected');
      try {
        await this.temporalCloudProvider.connectFromEnv();
        console.log('[Harness] Connected to Temporal Cloud');
        return;
      } catch (error) {
        console.warn('[Harness] Failed to connect to Temporal Cloud:', error);
        console.warn('[Harness] Falling back to self-hosted Temporal...');
      }
    }

    // Fall back to self-hosted Temporal
    try {
      this.temporalConnection = await Connection.connect({ address: TEMPORAL_ADDRESS });
      this.workflowClient = new WorkflowClient();
      console.log('[Harness] Connected to self-hosted Temporal at', TEMPORAL_ADDRESS);
    } catch (error) {
      console.warn('[Harness] Could not connect to Temporal (may not be running yet):', error);
      console.log('[Harness] API will still start but workflow execution will fail until Temporal is available');
    }
  }

  async startWorkflow(input: {
    projectName: string;
    projectDescription: string;
    initialStage: string;
    founderBrief: string;
  }): Promise<string> {
    // Try Temporal Cloud first
    if (this.temporalCloudProvider.isReady()) {
      return this.temporalCloudProvider.startWorkflow(input);
    }

    // Fall back to self-hosted
    if (!this.workflowClient) {
      throw new Error('Temporal client not initialized');
    }

    const workflowId = `factory-${Date.now()}`;
    const handle = this.workflowClient.start(runStartupFactoryWorkflow, {
      taskQueue: 'startup-factory-queue',
      args: [input],
      workflowId,
    });

    console.log('[Harness] Started workflow:', workflowId);
    return workflowId;
  }

  async runExpertLoop(content: string, maxIterations: number = 3): Promise<string> {
    return runExpertLoopGraph(content, maxIterations);
  }

  getA2AHandler(agentId: string): A2AProtocolHandler | undefined {
    return this.a2aHandlers.get(agentId);
  }

  getTemporalStatus(): { connected: boolean; type: string; address: string | null; namespace: string | null } {
    const cloudStatus = this.temporalCloudProvider.getStatus();
    
    return {
      connected: cloudStatus.connected || this.workflowClient !== null,
      type: cloudStatus.connected ? 'cloud' : 'self-hosted',
      address: cloudStatus.address || TEMPORAL_ADDRESS,
      namespace: cloudStatus.namespace || TEMPORAL_NAMESPACE,
    };
  }

  async shutdown(): Promise<void> {
    console.log('[Harness] Shutting down...');
    if (this.temporalConnection) {
      await this.temporalConnection.close();
    }
  }
}

// Export singleton instance
export const harness = new StartupFactoryHarness();
export default harness;

// Export Express app for direct use
export { app };

// Allow running directly
if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`[HTTP] Server listening on ${HOST}:${PORT}`);
    console.log(`[HTTP] API endpoints:`);
    console.log(`  POST /api/startups          - Create a new startup`);
    console.log(`  GET  /api/startups          - List all startups`);
    console.log(`  GET  /api/startups/:id      - Get startup details`);
    console.log(`  PUT  /api/startups/:id/stage - Update startup stage`);
    console.log(`  POST /api/startups/:id/execute - Trigger expert loop workflow`);
  });

  harness.initialize().then(() => {
    console.log('[Harness] Startup Factory Harness ready');
    const status = harness.getTemporalStatus();
    console.log(`[Harness] Temporal: ${status.connected ? 'CONNECTED' : 'NOT CONNECTED'} (${status.type})`);
    if (status.address) {
      console.log(`[Harness] Temporal Address: ${status.address}`);
    }
    if (status.namespace) {
      console.log(`[Harness] Temporal Namespace: ${status.namespace}`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Harness] Received SIGTERM, shutting down gracefully...');
    server.close();
    await harness.shutdown();
    process.exit(0);
  });
}
