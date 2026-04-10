import { Connection, WorkflowClient } from '@temporalio/client';
import { runStartupFactoryWorkflow } from '../workflows/factory-workflow.js';

export interface TemporalCloudConfig {
  address: string;       // e.g., "foo.bar.tmprl.cloud:7233"
  namespace: string;     // e.g., "foo.bar"
  apiKey?: string;       // Temporal Cloud API key
  taskQueue?: string;
}

export class TemporalCloudProvider {
  private connection: Connection | null = null;
  private workflowClient: WorkflowClient | null = null;
  private config: TemporalCloudConfig | null = null;
  private isConnected: boolean = false;

  constructor() {}

  /**
   * Configure and connect to Temporal Cloud
   */
  async connect(config: TemporalCloudConfig): Promise<void> {
    this.config = config;
    
    const connectionConfig: any = {
      address: config.address,
    };

    // Add API key for Temporal Cloud authentication
    if (config.apiKey) {
      connectionConfig.apiKey = config.apiKey;
    }

    try {
      console.log(`[TemporalCloud] Connecting to ${config.address}...`);
      this.connection = await Connection.connect(connectionConfig);
      
      // Create workflow client with namespace
      this.workflowClient = new WorkflowClient({
        connection: this.connection,
        namespace: config.namespace,
      });
      
      this.isConnected = true;
      console.log(`[TemporalCloud] Connected successfully to namespace: ${config.namespace}`);
    } catch (error) {
      console.error('[TemporalCloud] Failed to connect:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Connect using environment variables
   * TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, TEMPORAL_API_KEY
   */
  async connectFromEnv(): Promise<void> {
    const address = process.env.TEMPORAL_ADDRESS;
    const namespace = process.env.TEMPORAL_NAMESPACE;

    if (!address || !namespace) {
      throw new Error(
        'Missing Temporal Cloud configuration. Set TEMPORAL_ADDRESS and TEMPORAL_NAMESPACE env vars.\n' +
        'Get a free namespace at: https://cloud.temporal.io'
      );
    }

    await this.connect({
      address,
      namespace,
      apiKey: process.env.TEMPORAL_API_KEY,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'startup-factory-queue',
    });
  }

  /**
   * Check if connected to Temporal
   */
  isReady(): boolean {
    return this.isConnected && this.workflowClient !== null;
  }

  /**
   * Start a startup factory workflow
   */
  async startWorkflow(input: {
    projectName: string;
    projectDescription: string;
    initialStage: string;
    founderBrief: string;
  }): Promise<string> {
    if (!this.workflowClient) {
      throw new Error('Temporal client not initialized. Call connect() first.');
    }

    const taskQueue = this.config?.taskQueue || 'startup-factory-queue';
    const workflowId = `factory-${Date.now()}-${input.projectName.toLowerCase().replace(/\s+/g, '-')}`;

    try {
      const handle = this.workflowClient.start(runStartupFactoryWorkflow, {
        taskQueue,
        args: [input],
        workflowId,
      });

      console.log(`[TemporalCloud] Started workflow: ${workflowId}`);
      return workflowId;
    } catch (error) {
      console.error('[TemporalCloud] Failed to start workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<any> {
    if (!this.workflowClient) {
      throw new Error('Temporal client not initialized');
    }

    try {
      const handle = this.workflowClient.getHandle(workflowId);
      const status = await handle.describe();
      return status;
    } catch (error) {
      console.error(`[TemporalCloud] Failed to get workflow status for ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Signal a running workflow
   */
  async signalWorkflow(workflowId: string, signalName: string, signalData?: any): Promise<void> {
    if (!this.workflowClient) {
      throw new Error('Temporal client not initialized');
    }

    try {
      const handle = this.workflowClient.getHandle(workflowId);
      await handle.signal(signalName, signalData);
      console.log(`[TemporalCloud] Sent signal ${signalName} to workflow ${workflowId}`);
    } catch (error) {
      console.error(`[TemporalCloud] Failed to signal workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get the workflow client for direct use
   */
  getClient(): WorkflowClient | null {
    return this.workflowClient;
  }

  /**
   * Get connection status info
   */
  getStatus(): { connected: boolean; address: string | null; namespace: string | null } {
    return {
      connected: this.isConnected,
      address: this.config?.address || null,
      namespace: this.config?.namespace || null,
    };
  }
}

// Singleton instance
export const temporalCloud = new TemporalCloudProvider();
