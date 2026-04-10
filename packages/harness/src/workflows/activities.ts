import '@temporalio/workflow';

// Re-export activity interfaces
export interface FactoryActivities {
  createProject(name: string, description: string): Promise<string>;
  updateLifecycleStage(projectId: string, stage: string): Promise<void>;
  runExpertLoop(founderBrief: string, context: { projectId: string; stage: string }): Promise<string>;
  persistArtifact(projectId: string, artifact: any): Promise<void>;
  sendA2AMessage(recipient: string, payload: any): Promise<void>;
}

// Activity implementations - these run on the worker
export const factoryActivities = {
  async createProject(name: string, description: string): Promise<string> {
    console.log('[Activity] Creating project:', name);
    // In real implementation, this would write to Prisma
    const projectId = `proj_${Date.now()}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    return projectId;
  },

  async updateLifecycleStage(projectId: string, stage: string): Promise<void> {
    console.log(`[Activity] Updating project ${projectId} to stage:`, stage);
    // In real implementation, this would update Prisma
  },

  async runExpertLoop(founderBrief: string, context: { projectId: string; stage: string }): Promise<string> {
    console.log(`[Activity] Running expert loop for project ${context.projectId}`);
    // Import and run the expert loop
    const { runExpertLoopGraph } = await import('../graph/expert-loop-graph.js');
    const result = await runExpertLoopGraph(founderBrief, 3, context.projectId, context.stage);
    return result;
  },

  async persistArtifact(projectId: string, artifact: any): Promise<void> {
    console.log(`[Activity] Persisting artifact for project ${projectId}`);
    // In real implementation, this would write to Prisma artifacts table
  },

  async sendA2AMessage(recipient: string, payload: any): Promise<void> {
    console.log(`[Activity] Sending A2A message to ${recipient}:`, payload);
    // In real implementation, this would use the A2A message bus
  },
};
