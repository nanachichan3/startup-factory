import { Context } from '@temporalio/activity';

export interface FactoryActivities {
  createProject(name: string, description: string): Promise<string>;
  updateLifecycleStage(projectId: string, stage: string): Promise<void>;
  runExpertLoop(content: string, context: Record<string, any>): Promise<string>;
  persistArtifact(projectId: string, artifact: any): Promise<void>;
  sendA2AMessage(recipient: string, message: any): Promise<void>;
}

export const factoryActivities: FactoryActivities = {
  async createProject(name: string, description: string): Promise<string> {
    console.log(`[Activity] Creating project: ${name}`);
    // In production, this would write to PostgreSQL
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return projectId;
  },

  async updateLifecycleStage(projectId: string, stage: string): Promise<void> {
    console.log(`[Activity] Updating project ${projectId} to stage: ${stage}`);
    // In production, this would update PostgreSQL
  },

  async runExpertLoop(content: string, context: Record<string, any>): Promise<string> {
    console.log(`[Activity] Running expert loop for context: ${JSON.stringify(context)}`);
    // This will be handled by the Langgraph expert loop
    return `[Refined] ${content}`;
  },

  async persistArtifact(projectId: string, artifact: any): Promise<void> {
    console.log(`[Activity] Persisting artifact for project ${projectId}`);
    // In production, this would write to PostgreSQL
  },

  async sendA2AMessage(recipient: string, message: any): Promise<void> {
    console.log(`[Activity] Sending A2A message to ${recipient}:`, message);
    // This would use the A2A protocol handler
  },
};
