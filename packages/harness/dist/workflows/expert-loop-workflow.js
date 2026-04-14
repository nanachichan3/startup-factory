import { proxyActivities } from '@temporalio/workflow';
const { createProject, updateLifecycleStage, runExpertLoop, persistArtifact, sendA2AMessage } = proxyActivities({
    startToCloseTimeout: '1 hour',
    retry: {
        maximumAttempts: 3,
        initialInterval: '1 minute',
    },
});
/**
 * Expert Loop Workflow - Runs the Universal Expert Loop via Temporal
 *
 * This workflow orchestrates the expert loop pattern where input is processed
 * through specialized AI personas: listen → decide → delegate → validate → persist → reflect
 */
export async function runExpertLoopWorkflow(input) {
    console.log('[ExpertLoopWorkflow] Starting expert loop workflow');
    console.log('[ExpertLoopWorkflow] Input content:', input.content.substring(0, 100) + '...');
    const maxIterations = input.maxIterations || 3;
    let processedContent = input.content;
    const artifacts = [];
    let iterations = 0;
    // Create project if not exists
    let projectId = input.projectId;
    if (!projectId) {
        projectId = await createProject('Expert Loop Project', 'Project created by expert loop workflow');
        console.log('[ExpertLoopWorkflow] Created project:', projectId);
    }
    // Update lifecycle stage if provided
    if (input.stage) {
        await updateLifecycleStage(projectId, input.stage);
    }
    // Run expert loop iterations
    for (let i = 0; i < maxIterations; i++) {
        iterations++;
        console.log(`[ExpertLoopWorkflow] Iteration ${iterations}/${maxIterations}`);
        // Run the expert loop - this invokes Langgraph under the hood
        const loopOutput = await runExpertLoop(processedContent, {
            projectId,
            stage: input.stage || 'Ideation',
        });
        // Persist the artifact from this iteration
        const artifact = {
            iteration: i,
            input: processedContent,
            output: loopOutput,
            persistedAt: new Date().toISOString(),
        };
        await persistArtifact(projectId, artifact);
        artifacts.push(artifact);
        // Update processed content for next iteration
        processedContent = loopOutput;
        // Check if we've reached a good stopping point
        if (i < maxIterations - 1) {
            // Notify CEO about progress
            await sendA2AMessage('ceo', {
                type: 'EXPERT_LOOP_PROGRESS',
                iteration: i + 1,
                maxIterations,
                projectId,
            });
        }
    }
    // Final notification to CEO
    await sendA2AMessage('ceo', {
        type: 'EXPERT_LOOP_COMPLETE',
        projectId,
        iterations,
        finalOutput: processedContent,
    });
    console.log('[ExpertLoopWorkflow] Expert loop workflow complete');
    return {
        processedContent,
        iterations,
        artifacts,
        finalOutput: processedContent,
    };
}
/**
 * Advance Project Stage Workflow - Moves a project to the next lifecycle stage
 */
export async function advanceProjectStageWorkflow(projectId, currentStage, nextStage, stageArtifacts) {
    console.log(`[AdvanceStageWorkflow] Moving project ${projectId} from ${currentStage} to ${nextStage}`);
    // Update the stage
    await updateLifecycleStage(projectId, nextStage);
    // Persist the stage transition artifact
    await persistArtifact(projectId, {
        type: 'stage_transition',
        projectId,
        fromStage: currentStage,
        toStage: nextStage,
        artifacts: stageArtifacts,
        transitionedAt: new Date().toISOString(),
    });
    // Notify CEO about stage change
    await sendA2AMessage('ceo', {
        type: 'STAGE_ADVANCED',
        projectId,
        from: currentStage,
        to: nextStage,
    });
    console.log(`[AdvanceStageWorkflow] Stage advanced successfully`);
}
export { runExpertLoopWorkflow as expertLoopWorkflow };
