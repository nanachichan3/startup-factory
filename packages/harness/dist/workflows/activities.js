import '@temporalio/workflow';
// Activity implementations - these run on the worker
export const factoryActivities = {
    async createProject(name, description) {
        console.log('[Activity] Creating project:', name);
        // In real implementation, this would write to Prisma
        const projectId = `proj_${Date.now()}_${name.toLowerCase().replace(/\s+/g, '_')}`;
        return projectId;
    },
    async updateLifecycleStage(projectId, stage) {
        console.log(`[Activity] Updating project ${projectId} to stage:`, stage);
        // In real implementation, this would update Prisma
    },
    async runExpertLoop(founderBrief, context) {
        console.log(`[Activity] Running expert loop for project ${context.projectId}`);
        // Import and run the expert loop
        const { runExpertLoopGraph } = await import('../graph/expert-loop-graph.js');
        const result = await runExpertLoopGraph(founderBrief, 3, context.projectId, context.stage);
        return result;
    },
    async persistArtifact(projectId, artifact) {
        console.log(`[Activity] Persisting artifact for project ${projectId}`);
        // In real implementation, this would write to Prisma artifacts table
    },
    async sendA2AMessage(recipient, payload) {
        console.log(`[Activity] Sending A2A message to ${recipient}:`, payload);
        // In real implementation, this would use the A2A message bus
    },
};
