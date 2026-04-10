import { StateGraph, END, START } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// --- State Schema ---
export interface ExpertLoopState {
  messages: Array<{ role: string; content: string }>;
  currentTask: string;
  taskQueue: string[];
  delegateTarget: string | null;
  validationResults: Record<string, any>;
  persistedArtifacts: any[];
  reflectionNotes: string[];
  iteration: number;
  maxIterations: number;
  finalOutput: string | null;
}

const InitialState: ExpertLoopState = {
  messages: [],
  currentTask: '',
  taskQueue: [],
  delegateTarget: null,
  validationResults: {},
  persistedArtifacts: [],
  reflectionNotes: [],
  iteration: 0,
  maxIterations: 3,
  finalOutput: null,
};

// --- Node Definitions ---

/**
 * Listen Node - Receives input and parses the task
 */
async function listenNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log('[Langgraph:Listen] Processing input...');
  const lastMessage = state.messages[state.messages.length - 1];

  return {
    currentTask: lastMessage?.content || state.currentTask,
    taskQueue: state.taskQueue.length > 0 ? state.taskQueue : ['analyze', 'plan', 'execute'],
  };
}

/**
 * Decide Node - Analyzes task and decides delegation strategy
 */
async function decideNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log('[Langgraph:Decide] Analyzing task and deciding strategy...');

  const task = state.currentTask;
  let delegateTarget = 'critic';

  // Simple routing logic based on task content
  if (task.toLowerCase().includes('validate') || task.toLowerCase().includes('check')) {
    delegateTarget = 'validator';
  } else if (task.toLowerCase().includes('build') || task.toLowerCase().includes('create')) {
    delegateTarget = 'builder';
  } else if (task.toLowerCase().includes('review') || task.toLowerCase().includes('critique')) {
    delegateTarget = 'critic';
  }

  return {
    delegateTarget,
    messages: [
      ...state.messages,
      { role: 'system', content: `Decision: Delegating to ${delegateTarget} expert` },
    ],
  };
}

/**
 * Delegate Node - Routes task to appropriate specialist
 */
async function delegateNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log('[Langgraph:Delegate] Delegating to:', state.delegateTarget);

  const delegateTarget = state.delegateTarget || 'general';
  const specialists: Record<string, string> = {
    critic: 'You are a critical thinking expert. Identify flaws and risks.',
    validator: 'You are a validation expert. Verify accuracy and completeness.',
    builder: 'You are a building expert. Create practical implementations.',
    optimizer: 'You are an optimization expert. Improve efficiency and quality.',
    general: 'You are a helpful assistant. Provide comprehensive guidance.',
  };

  const specialistPrompt = specialists[delegateTarget] || specialists.general;
  const taskContent = state.currentTask;

  // In production, this would call the LLM
  const refinedContent = `[${delegateTarget.toUpperCase()}] Processed: ${taskContent}\n${specialistPrompt}`;

  return {
    messages: [
      ...state.messages,
      { role: 'delegate', content: refinedContent },
    ],
    taskQueue: state.taskQueue.slice(1), // Remove processed task
  };
}

/**
 * Validate Node - Validates the output of delegation
 */
async function validateNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log('[Langgraph:Validate] Validating output...');

  const lastDelegateOutput = state.messages[state.messages.length - 1]?.content || '';
  const validationResults = {
    isValid: lastDelegateOutput.length > 0,
    hasContent: !lastDelegateOutput.includes('ERROR'),
    timestamp: new Date().toISOString(),
  };

  return {
    validationResults: {
      ...state.validationResults,
      [`iteration_${state.iteration}`]: validationResults,
    },
  };
}

/**
 * Persist Node - Saves validated output as artifact
 */
async function persistNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log('[Langgraph:Persist] Saving artifact...');

  const artifact = {
    iteration: state.iteration,
    content: state.messages[state.messages.length - 1]?.content,
    validated: state.validationResults[`iteration_${state.iteration}`]?.isValid,
    persistedAt: new Date().toISOString(),
  };

  return {
    persistedArtifacts: [...state.persistedArtifacts, artifact],
  };
}

/**
 * Reflect Node - Reviews progress and decides whether to continue or finish
 */
async function reflectNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log('[Langgraph:Reflect] Reviewing iteration:', state.iteration);

  const reflectionNote = `Iteration ${state.iteration} complete. Tasks remaining: ${state.taskQueue.length}`;
  const shouldContinue = state.iteration < state.maxIterations && state.taskQueue.length > 0;

  return {
    iteration: shouldContinue ? state.iteration + 1 : state.iteration,
    reflectionNotes: [...state.reflectionNotes, reflectionNote],
    finalOutput: !shouldContinue ? state.messages[state.messages.length - 1]?.content : null,
  };
}

// --- Build the Graph ---
function createExpertLoopGraph() {
  const workflow = new StateGraph<ExpertLoopState>({
    channels: {
      messages: { default: () => [] },
      currentTask: { default: () => '' },
      taskQueue: { default: () => [] },
      delegateTarget: { default: () => null },
      validationResults: { default: () => ({}) },
      persistedArtifacts: { default: () => [] },
      reflectionNotes: { default: () => [] },
      iteration: { default: () => 0 },
      maxIterations: { default: () => 3 },
      finalOutput: { default: () => null },
    },
  });

  // Add nodes
  workflow.addNode('listen', listenNode);
  workflow.addNode('decide', decideNode);
  workflow.addNode('delegate', delegateNode);
  workflow.addNode('validate', validateNode);
  workflow.addNode('persist', persistNode);
  workflow.addNode('reflect', reflectNode);

  // Define edges
  workflow.addEdge(START, 'listen');
  workflow.addEdge('listen', 'decide');
  workflow.addEdge('decide', 'delegate');
  workflow.addEdge('delegate', 'validate');
  workflow.addEdge('validate', 'persist');
  workflow.addEdge('persist', 'reflect');

  // Conditional routing after reflect
  workflow.addConditionalEdges('reflect', (state: ExpertLoopState) => {
    if (state.iteration >= state.maxIterations || state.taskQueue.length === 0) {
      return 'done';
    }
    return 'continue';
  }, {
    done: END,
    continue: 'listen',
  });

  return workflow.compile();
}

export const expertLoopGraph = createExpertLoopGraph();

/**
 * Run the Universal Expert Loop via Langgraph
 */
export async function runExpertLoop(
  initialInput: string,
  maxIterations: number = 3
): Promise<string> {
  const initialState: ExpertLoopState = {
    ...InitialState,
    messages: [{ role: 'user', content: initialInput }],
    maxIterations,
  };

  const result = await expertLoopGraph.invoke(initialState);

  return result.finalOutput || result.messages[result.messages.length - 1]?.content || initialInput;
}

export { expertLoopGraph as graph };
