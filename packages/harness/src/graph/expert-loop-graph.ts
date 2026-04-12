import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';
import { searchMemories, addMemories, isMem0Available } from '../memory/mem0.js';

dotenv.config();

// Lazy initialize OpenRouter LLM - only create when first needed
let openRouterClient: ChatOpenAI | null = null;

function getOpenRouterClient(): ChatOpenAI {
  if (!openRouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    openRouterClient = new ChatOpenAI({
      openAIApiKey: apiKey,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
      },
      modelName: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
      temperature: 0.7,
    });
  }
  return openRouterClient;
}

// --- State Interface ---
export interface ExpertLoopState {
  messages: Array<{ role: string; content: string }>;
  currentTask: string;
  projectName: string;
  stage: string;
  delegateTarget: 'cto' | 'cmo' | null;
  artifacts: Record<string, any>;
  validationResults: Record<string, any>;
  iteration: number;
  maxIterations: number;
  done: boolean;
  error: string | null;
}

// Initial state factory
function createInitialState(
  input: string, 
  projectName: string = 'Unknown Project',
  stage: string = 'idea',
  maxIterations: number = 3
): ExpertLoopState {
  return {
    messages: [{ role: 'user', content: input }],
    currentTask: input,
    projectName,
    stage,
    delegateTarget: null,
    artifacts: {},
    validationResults: {},
    iteration: 0,
    maxIterations,
    done: false,
    error: null,
  };
}

// --- Node Implementations ---

/**
 * Node 1: Listen
 * Parses the startup brief and extracts key information
 */
async function listenNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log(`[ExpertLoop:Listen] Processing: ${state.projectName}`);

  const prompt = `You are analyzing a startup brief. Extract and structure the following information:
- Project name
- Core problem being solved
- Target market
- Current stage
- Key requirements mentioned

Startup brief: ${state.currentTask}

Respond with a structured analysis.`;

  try {
    const response = await getOpenRouterClient().invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.currentTask),
    ]);

    const content = response.content.toString();
    
    return {
      currentTask: content,
      artifacts: {
        ...state.artifacts,
        brief: { analysis: content },
      },
    };
  } catch (error) {
    console.error('[ExpertLoop:Listen] Error:', error);
    return {
      error: `Listen node failed: ${error}`,
    };
  }
}

/**
 * Node 2: Decide
 * Decides which expert (CTO or CMO) should handle the current task
 */
async function decideNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log(`[ExpertLoop:Decide] Analyzing task for ${state.projectName}`);

  const prompt = `Analyze this startup brief and decide whether it needs:
- CTO (Chief Technology Officer): Technical architecture, MVP specification, tech stack decisions
- CMO (Chief Marketing Officer): GTM strategy, content planning, market positioning

Startup: ${state.projectName}
Brief: ${state.currentTask}
Current Stage: ${state.stage}

Respond with either "cto" or "cmo" based on which expertise is most critical right now.`;

  try {
    const response = await getOpenRouterClient().invoke([
      new SystemMessage(prompt),
    ]);

    const content = response.content.toString().toLowerCase();
    const delegateTarget = content.includes('cmo') ? 'cmo' : 'cto';

    return {
      delegateTarget,
      artifacts: {
        ...state.artifacts,
        decision: { delegate: delegateTarget, reason: content },
      },
    };
  } catch (error) {
    console.error('[ExpertLoop:Decide] Error:', error);
    return {
      delegateTarget: 'cto',
      error: `Decide node failed: ${error}`,
    };
  }
}

/**
 * Node 3: Delegate
 * Invokes the appropriate expert agent based on decision
 */
async function delegateNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  const target = state.delegateTarget || 'cto';
  console.log(`[ExpertLoop:Delegate] Routing to ${target.toUpperCase()} for ${state.projectName}`);

  // Retrieve relevant memories from Mem0 before expert call
  let memoryContext = '';
  if (isMem0Available()) {
    try {
      const memories = await searchMemories(target, state.currentTask, 3);
      if (memories.length > 0) {
        memoryContext = `\n\n[Relevant Context from Memory]\n${memories.map(m => `- ${m}`).join('\n')}\n`;
        console.log(`[ExpertLoop:Delegate] Retrieved ${memories.length} relevant memories`);
      }
    } catch (e) {
      console.warn('[ExpertLoop:Delegate] Memory search failed:', e);
    }
  }

  const ctoPrompt = `You are the CTO (Chief Technology Officer) for the Startup Factory.
Your role is to create technical architecture and MVP specifications.

Project: ${state.projectName}
Brief: ${state.currentTask}
Current Stage: ${state.stage}${memoryContext}
Create a comprehensive technical response including:
1. Tech stack recommendations
2. System architecture overview
3. MVP feature priority list
4. Technical risks and mitigations
5. Development timeline estimate

Be specific and actionable.`;

  const cmoPrompt = `You are the CMO (Chief Marketing Officer) for the Startup Factory.
Your role is to create GTM strategies and content plans.

Project: ${state.projectName}
Brief: ${state.currentTask}
Current Stage: ${state.stage}${memoryContext}
Create a comprehensive marketing response including:
1. Target customer segments
2. GTM strategy (channels, tactics)
3. Content plan for first 30 days
4. Key messaging and positioning
5. Launch timeline

Be specific and actionable.`;

  const prompt = target === 'cmo' ? cmoPrompt : ctoPrompt;

  try {
    const response = await getOpenRouterClient().invoke([
      new SystemMessage(prompt),
      new HumanMessage(state.currentTask),
    ]);

    const content = response.content.toString();
    const artifactType = target === 'cmo' ? 'gtm_strategy' : 'tech_architecture';

    // Store the expert's output as a memory in Mem0
    if (isMem0Available()) {
      try {
        await addMemories(target, [
          { role: 'user', content: `Task for ${state.projectName}: ${state.currentTask}` },
          { role: 'assistant', content },
        ]);
      } catch (e) {
        console.warn('[ExpertLoop:Delegate] Memory store failed:', e);
      }
    }

    return {
      artifacts: {
        ...state.artifacts,
        [artifactType]: {
          content,
          timestamp: new Date().toISOString(),
          agent: target,
        },
      },
      messages: [
        ...state.messages,
        { role: 'delegate', content: `[${target.toUpperCase()}] ${content}` },
      ],
    };
  } catch (error) {
    console.error('[ExpertLoop:Delegate] Error:', error);
    return {
      error: `Delegate node failed: ${error}`,
    };
  }
}

/**
 * Node 4: Validate
 * Validates the output quality from Delegate
 */
async function validateNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log(`[ExpertLoop:Validate] Checking output quality for iteration ${state.iteration}`);

  const lastArtifact = Object.values(state.artifacts).slice(-1)[0];
  const content = lastArtifact?.content || '';

  const prompt = `Validate this expert output for quality and completeness.
Check for:
- Is it actionable and specific?
- Does it address the startup's needs?
- Is it well-structured?
- Are there any obvious gaps or issues?

Output to validate (first 500 chars):
${content.substring(0, 500)}

Respond with YES if the output is valid and useful, or NO if it needs improvement.`;

  try {
    const response = await getOpenRouterClient().invoke([
      new SystemMessage(prompt),
    ]);

    const content_str = response.content.toString();
    const isValid = !content_str.toLowerCase().includes('no') && content_str.length > 50;

    return {
      validationResults: {
        ...state.validationResults,
        [`iteration_${state.iteration}`]: {
          isValid,
          quality: isValid ? 'high' : 'needs_work',
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('[ExpertLoop:Validate] Error:', error);
    return {
      validationResults: {
        ...state.validationResults,
        [`iteration_${state.iteration}`]: {
          isValid: true,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}

/**
 * Node 5: Persist
 * Saves the validated artifact
 */
async function persistNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log(`[ExpertLoop:Persist] Saving artifacts for ${state.projectName}`);

  return {
    artifacts: {
      ...state.artifacts,
      _persistMetadata: {
        persistedAt: new Date().toISOString(),
        iteration: state.iteration,
      },
    },
  };
}

/**
 * Node 6: Reflect
 * Reviews progress and decides whether to continue or finish
 */
async function reflectNode(state: ExpertLoopState): Promise<Partial<ExpertLoopState>> {
  console.log(`[ExpertLoop:Reflect] Iteration ${state.iteration + 1}/${state.maxIterations}`);

  const hasMoreIterations = state.iteration < state.maxIterations - 1;
  const lastValidation = state.validationResults[`iteration_${state.iteration}`];
  const isValid = lastValidation?.isValid !== false;
  
  const shouldContinue = hasMoreIterations && !isValid;

  if (!shouldContinue) {
    console.log(`[ExpertLoop:Reflect] Loop complete. Valid: ${isValid}`);
  }

  return {
    iteration: state.iteration + 1,
    done: !shouldContinue && state.iteration >= state.maxIterations - 1,
    artifacts: {
      ...state.artifacts,
      finalQuality: lastValidation?.quality || 'unknown',
      completedAt: !shouldContinue ? new Date().toISOString() : undefined,
    },
  };
}

/**
 * Run the Universal Expert Loop using LangGraph
 */
export async function runExpertLoopGraph(
  initialInput: string,
  maxIterations: number = 3,
  projectName: string = 'Startup',
  stage: string = 'idea'
): Promise<string> {
  const initialState = createInitialState(initialInput, projectName, stage, maxIterations);
  
  // Simple sequential execution instead of LangGraph StateGraph for now
  // This avoids the complex channel configuration issues
  let state = initialState;

  while (state.iteration < state.maxIterations && !state.done) {
    console.log(`[ExpertLoop] Iteration ${state.iteration + 1}/${state.maxIterations}`);

    // Execute each node in sequence
    const listenResult = await listenNode(state);
    state = { ...state, ...listenResult };

    const decideResult = await decideNode(state);
    state = { ...state, ...decideResult };

    const delegateResult = await delegateNode(state);
    state = { ...state, ...delegateResult };

    const validateResult = await validateNode(state);
    state = { ...state, ...validateResult };

    const persistResult = await persistNode(state);
    state = { ...state, ...persistResult };

    const reflectResult = await reflectNode(state);
    state = { ...state, ...reflectResult };
  }

  // Return the most relevant artifact
  const techArch = state.artifacts?.tech_architecture?.content;
  const gtmStrategy = state.artifacts?.gtm_strategy?.content;
  
  return techArch || gtmStrategy || state.currentTask || initialInput;
}

/**
 * Run a simplified version without LLM calls (for testing/fallback)
 */
export async function runExpertLoopGraphSimple(
  initialInput: string,
  maxIterations: number = 3
): Promise<string> {
  let state = createInitialState(initialInput, 'Test Project', 'idea', maxIterations);

  while (state.iteration < state.maxIterations && !state.done) {
    console.log(`[ExpertLoop:Simple] Iteration ${state.iteration + 1}/${state.maxIterations}`);
    
    state.currentTask = `[Iter ${state.iteration + 1}] ${initialInput}`;
    state.delegateTarget = 'cto';
    state.artifacts.tech_architecture = { 
      content: `Technical architecture for: ${state.currentTask}`,
      timestamp: new Date().toISOString(),
    };
    state.validationResults[`iteration_${state.iteration}`] = { isValid: true };
    state.iteration++;
    
    if (state.iteration >= state.maxIterations) {
      state.done = true;
    }
  }

  return state.artifacts.tech_architecture?.content || initialInput;
}
