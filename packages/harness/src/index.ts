import { Connection, WorkflowClient } from '@temporalio/client';
import { factoryActivities } from './workflows/activities';
import { runStartupFactoryWorkflow } from './workflows/factory-workflow';
import { runExpertLoop } from './graph/expert-loop';
import { A2AProtocolHandler, createA2AHandler } from './protocol/a2a';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

/**
 * Startup Factory Harness - Main Entry Point
 * 
 * This harness orchestrates:
 * - Temporal.io for workflow orchestration
 * - Langgraph for the Universal Expert Loop
 * - A2A Protocol for agent communication
 */
class StartupFactoryHarness {
  private temporalConnection: Connection | null = null;
  private workflowClient: WorkflowClient | null = null;
  private a2aHandlers: Map<string, A2AProtocolHandler> = new Map();

  async initialize(): Promise<void> {
    console.log('[Harness] Initializing Startup Factory Harness...');

    // Connect to Temporal
    try {
      this.temporalConnection = await Connection.connect({ address: TEMPORAL_ADDRESS });
      this.workflowClient = new WorkflowClient();
      console.log('[Harness] Connected to Temporal at', TEMPORAL_ADDRESS);
    } catch (error) {
      console.warn('[Harness] Could not connect to Temporal (may not be running yet):', error);
    }

    // Initialize A2A handlers for each agent role
    this.a2aHandlers.set('ceo', createA2AHandler('ceo'));
    this.a2aHandlers.set('cto', createA2AHandler('cto'));
    this.a2aHandlers.set('cmo', createA2AHandler('cmo'));

    console.log('[Harness] A2A handlers initialized for CEO, CTO, CMO');
  }

  async startWorkflow(input: {
    projectName: string;
    projectDescription: string;
    initialStage: string;
    founderBrief: string;
  }): Promise<string> {
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
    return runExpertLoop(content, maxIterations);
  }

  getA2AHandler(agentId: string): A2AProtocolHandler | undefined {
    return this.a2aHandlers.get(agentId);
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

// Allow running directly
if (require.main === module) {
  harness.initialize().then(() => {
    console.log('[Harness] Startup Factory Harness ready');
    console.log('[Harness] Temporal address:', TEMPORAL_ADDRESS);
  });
}
