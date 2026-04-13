/**
 * Mem0 Memory Integration
 * Provides long-term memory for AI agents using self-hosted Mem0 API.
 */

const mem0Host = process.env.MEM0_BASE_URL || process.env.MEM0_URL || process.env.MEM0_HOST;
let mem0Available = false;
let mem0InitAttempted = false;

async function mem0Request(path: string, body: object): Promise<any> {
  const url = `${mem0Host}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Mem0 API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Initialize Mem0 and check availability.
 */
export async function initializeMem0(): Promise<boolean> {
  if (mem0InitAttempted) return mem0Available;
  mem0InitAttempted = true;

  if (!mem0Host) {
    console.warn('[Mem0] MEM0_BASE_URL not set — Mem0 disabled');
    return false;
  }

  try {
    const response = await fetch(`${mem0Host}/health`);
    if (response.ok) {
      mem0Available = true;
      console.log(`[Mem0] Connected to ${mem0Host}`);
      return true;
    }
  } catch (error: any) {
    console.warn(`[Mem0] Not available at ${mem0Host}:`, error?.message);
  }
  mem0Available = false;
  return false;
}

export function isMem0Available(): boolean {
  return mem0Available;
}

export async function addMemories(
  agentId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  if (!mem0Available || !mem0Host) return;

  try {
    const result = await mem0Request('/memories', {
      messages,
      user_id: agentId,
    });
    if (result.status === 'ok') {
      console.log(`[Mem0] Added ${messages.length} messages for agent ${agentId}`);
    } else {
      console.error(`[Mem0] Add failed:`, result.error);
    }
  } catch (error: any) {
    console.error(`[Mem0] Failed to add memories for ${agentId}:`, error?.message);
  }
}

export async function searchMemories(
  agentId: string,
  query: string,
  limit: number = 5
): Promise<string[]> {
  if (!mem0Available || !mem0Host) return [];

  try {
    const result = await mem0Request('/search', {
      query,
      user_id: agentId,
      limit,
    });
    if (result.status === 'ok') {
      const memories = result.results?.results || [];
      console.log(`[Mem0] Found ${memories.length} memories for agent ${agentId}`);
      return memories.map((r: any) => r.memory || '').filter(Boolean);
    }
    return [];
  } catch (error: any) {
    console.error(`[Mem0] Failed to search memories for ${agentId}:`, error?.message);
    return [];
  }
}

export async function getAllMemories(
  agentId: string,
  limit: number = 50
): Promise<Array<{ id: string; memory: string; created_at: Date }>> {
  if (!mem0Available || !mem0Host) return [];

  try {
    const result = await mem0Request('/memories/all', {
      user_id: agentId,
      limit,
    });
    if (result.status === 'ok') {
      return (result.results || []).map((r: any) => ({
        id: r.id,
        memory: r.memory || '',
        created_at: new Date(r.created_at),
      }));
    }
    return [];
  } catch (error: any) {
    console.error(`[Mem0] Failed to get memories for ${agentId}:`, error?.message);
    return [];
  }
}

export async function deleteMemory(agentId: string, memoryId: string): Promise<void> {
  if (!mem0Available || !mem0Host) return;

  try {
    await mem0Request('/memories/delete', {
      memory_id: memoryId,
      user_id: agentId,
    });
    console.log(`[Mem0] Deleted memory ${memoryId} for agent ${agentId}`);
  } catch (error: any) {
    console.error(`[Mem0] Failed to delete memory ${memoryId}:`, error?.message);
  }
}
