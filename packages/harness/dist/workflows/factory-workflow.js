import { proxyActivities } from '@temporalio/workflow';
const { createProject, updateLifecycleStage, runExpertLoop, persistArtifact, sendA2AMessage } = proxyActivities({
    startToCloseTimeout: '1 hour',
    retry: {
        maximumAttempts: 3,
        initialInterval: '1 minute',
    },
});
/**
 * Main Startup Factory workflow.
 * Orchestrates the entire startup creation process through Temporal.
 */
export async function runStartupFactoryWorkflow(input) {
    console.log('[Workflow] Starting Startup Factory workflow for:', input.projectName);
    // Step 1: Create the project
    const projectId = await createProject(input.projectName, input.projectDescription);
    console.log('[Workflow] Project created with ID:', projectId);
    // Step 2: Set initial lifecycle stage
    await updateLifecycleStage(projectId, input.initialStage);
    console.log('[Workflow] Initial stage set to:', input.initialStage);
    // Step 3: Run the Universal Expert Loop (UEL) for refinement
    const expertLoopOutput = await runExpertLoop(input.founderBrief, {
        projectId,
        stage: input.initialStage,
    });
    console.log('[Workflow] Expert loop completed');
    // Step 4: Persist the initial artifact
    const initialArtifact = {
        projectId,
        projectName: input.projectName,
        brief: input.founderBrief,
        expertRefinement: expertLoopOutput,
        createdAt: new Date().toISOString(),
    };
    await persistArtifact(projectId, initialArtifact);
    // Step 5: Notify CEO agent via A2A
    await sendA2AMessage('ceo', {
        type: 'PROJECT_CREATED',
        projectId,
        nextAction: 'REVIEW_ARTIFACT',
    });
    return {
        projectId,
        currentStage: input.initialStage,
        artifacts: [initialArtifact],
        expertLoopOutput,
    };
}
/**
 * Workflow to advance a project to the next lifecycle stage.
 */
export async function advanceStageWorkflow(projectId, currentStage, nextStage, stageArtifacts) {
    console.log(`[Workflow] Advancing project ${projectId} from ${currentStage} to ${nextStage}`);
    await updateLifecycleStage(projectId, nextStage);
    await persistArtifact(projectId, {
        stageTransition: { from: currentStage, to: nextStage },
        artifacts: stageArtifacts,
        transitionedAt: new Date().toISOString(),
    });
    await sendA2AMessage('ceo', {
        type: 'STAGE_ADVANCED',
        projectId,
        from: currentStage,
        to: nextStage,
    });
}
