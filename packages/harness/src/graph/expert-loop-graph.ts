import { z } from 'zod';

/**
 * Expert Loop Graph Implementation
 * 
 * A simplified expert loop graph that processes input through 6 stages:
 * listen → decide → delegate → validate → persist → reflect
 * 
 * This implementation uses a functional approach to ensure TypeScript compatibility
 * with the Langgraph library.
 */

// --- State Interface ---
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
  done: boolean;
}

// Initial state factory
function createInitialState(input: string, maxIterations: number): ExpertLoopState {
  return {
    messages: [{ role: 'user', content: input }],
    currentTask: input,
    taskQueue: ['analyze', 'plan', 'execute', 'review'],
    delegateTarget: null,
    validationResults: {},
    persistedArtifacts: [],
    reflectionNotes: [],
    iteration: 0,
    maxIterations,
    finalOutput: null,
    done: false,
  };
}

// --- Node Functions ---

function listenNode(state: ExpertLoopState): ExpertLoopState {
  console.log('[ExpertLoopGraph:Listen] Processing input...');
  const lastMessage = state.messages[state.messages.length - 1];
  
  return {
    ...state,
    currentTask: lastMessage?.content || state.currentTask,
    taskQueue: state.taskQueue.length > 0 ? state.taskQueue : ['analyze', 'plan', 'execute'],
  };
}

function decideNode(state: ExpertLoopState): ExpertLoopState {
  console.log('[ExpertLoopGraph:Decide] Analyzing task...');

  const task = state.currentTask.toLowerCase();
  let delegateTarget = 'general';

  if (task.includes('validate') || task.includes('check')) {
    delegateTarget = 'validator';
  } else if (task.includes('build') || task.includes('create')) {
    delegateTarget = 'builder';
  } else if (task.includes('review') || task.includes('analyze')) {
    delegateTarget = 'critic';
  } else if (task.includes('optimize') || task.includes('improve')) {
    delegateTarget = 'optimizer';
  }

  return {
    ...state,
    delegateTarget,
    messages: [
      ...state.messages,
      { role: 'system', content: `Decision: Routing to ${delegateTarget} specialist` },
    ],
  };
}

function delegateNode(state: ExpertLoopState): ExpertLoopState {
  console.log('[ExpertLoopGraph:Delegate] Delegating to:', state.delegateTarget);

  const delegateTarget = state.delegateTarget || 'general';
  
  const specialists: Record<string, string> = {
    critic: 'You are a critical thinking expert. Identify flaws and risks.',
    validator: 'You are a validation expert. Verify accuracy and completeness.',
    builder: 'You are a building expert. Create practical implementations.',
    optimizer: 'You are an optimization expert. Improve efficiency.',
    general: 'You are a helpful assistant.',
  };

  const specialistPrompt = specialists[delegateTarget] || specialists.general;
  const refinedContent = `[${delegateTarget.toUpperCase()}] ${specialistPrompt}\n\nTask: ${state.currentTask}`;

  return {
    ...state,
    messages: [
      ...state.messages,
      { role: 'delegate', content: refinedContent },
    ],
    taskQueue: state.taskQueue.slice(1),
  };
}

function validateNode(state: ExpertLoopState): ExpertLoopState {
  console.log('[ExpertLoopGraph:Validate] Validating output...');

  const lastOutput = state.messages[state.messages.length - 1]?.content || '';
  
  const validationResult = {
    isValid: lastOutput.length > 0 && !lastOutput.includes('ERROR'),
    hasContent: lastOutput.length > 0,
    timestamp: new Date().toISOString(),
  };

  return {
    ...state,
    validationResults: {
      ...state.validationResults,
      [`iteration_${state.iteration}`]: validationResult,
    },
  };
}

function persistNode(state: ExpertLoopState): ExpertLoopState {
  console.log('[ExpertLoopGraph:Persist] Saving artifact...');

  const artifact = {
    iteration: state.iteration,
    content: state.messages[state.messages.length - 1]?.content,
    validated: state.validationResults[`iteration_${state.iteration}`]?.isValid ?? false,
    delegateTarget: state.delegateTarget,
    persistedAt: new Date().toISOString(),
  };

  return {
    ...state,
    persistedArtifacts: [...state.persistedArtifacts, artifact],
  };
}

function reflectNode(state: ExpertLoopState): ExpertLoopState {
  console.log('[ExpertLoopGraph:Reflect] Reviewing iteration:', state.iteration);

  const hasMoreTasks = state.taskQueue.length > 0;
  const hasMoreIterations = state.iteration < state.maxIterations - 1;
  const shouldContinue = hasMoreTasks && hasMoreIterations;

  const reflectionNote = `Iteration ${state.iteration + 1} complete. Tasks remaining: ${state.taskQueue.length}`;

  return {
    ...state,
    iteration: state.iteration + 1,
    reflectionNotes: [...state.reflectionNotes, reflectionNote],
    finalOutput: !shouldContinue ? state.messages[state.messages.length - 1]?.content : null,
    done: !shouldContinue,
  };
}

// --- Graph Execution ---
type NodeFunction = (state: ExpertLoopState) => ExpertLoopState;

function runGraph(initialState: ExpertLoopState): ExpertLoopState {
  let state = initialState;

  // Graph traversal: listen → decide → delegate → validate → persist → reflect
  // Then either continue back to listen or finish

  while (!state.done && state.iteration < state.maxIterations) {
    console.log(`[ExpertLoopGraph] Iteration ${state.iteration + 1}/${state.maxIterations}`);

    // Execute each node in sequence
    state = listenNode(state);
    state = decideNode(state);
    state = delegateNode(state);
    state = validateNode(state);
    state = persistNode(state);
    state = reflectNode(state);
  }

  return state;
}

/**
 * Run the Universal Expert Loop
 * 
 * @param initialInput - The initial content to process
 * @param maxIterations - Maximum number of iterations (default: 3)
 * @returns The final refined output
 */
export async function runExpertLoopGraph(
  initialInput: string,
  maxIterations: number = 3
): Promise<string> {
  const initialState = createInitialState(initialInput, maxIterations);
  
  // Run the synchronous graph (can be made async if needed)
  const result = runGraph(initialState);

  return result.finalOutput || result.messages[result.messages.length - 1]?.content || initialInput;
}

/**
 * Expert Loop Graph class for more advanced use cases
 */
export class ExpertLoopGraph {
  private maxIterations: number;

  constructor(maxIterations: number = 3) {
    this.maxIterations = maxIterations;
  }

  async run(input: string): Promise<string> {
    return runExpertLoopGraph(input, this.maxIterations);
  }

  getState(): ExpertLoopState | null {
    return null; // Placeholder for state inspection
  }
}

// Export the graph instance
export const expertLoopGraph = new ExpertLoopGraph();
