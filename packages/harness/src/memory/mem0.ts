/**
 * Mem0 Memory Integration
 * Provides long-term memory for AI agents using Mem0 self-hosted API.
 * 
 * Usage:
 *   import { getMem0Client } from './memory/mem0';
 *   
 *   const client = getMem0Client('cto');
 *   await client.add([{ role: 'user', content: 'Agent prefers TypeScript' }]);
 *   const memories = await client.search('What does the agent prefer?');
 */

import { MemoryClient } from 'mem0ai';

const mem0Clients: Map<string, MemoryClient> = new Map();

// Default to false until Mem0 is confirmed running
let mem0Available = false;
let mem0InitAttempted = false;

/**
 * Get or create a Mem0 client for a specific agent.
 * The agentId is used as the user_id in Mem0 to namespace memories per agent.
 */
export function getMem0Client(agentId: string): MemoryClient | null {
  const host = process.env.MEM0_URL || process.env.MEM0_HOST;
  const apiKey = process.env.MEM0_API_KEY || 'mem0-self-hosted';

  if (!host) {
    console.warn(`[Mem0] MEM0_URL not configured — memory disabled for agent ${agentId}`);
    return null;
  }

  if (mem0Clients.has(agentId)) {
    return mem0Clients.get(agentId)!;
  }

  try {
    const client = new MemoryClient({
      apiKey,
      host,
    });
    mem0Clients.set(agentId, client);
    console.log(`[Mem0] Client initialized for agent ${agentId} at ${host}`);
    return client;
  } catch (error) {
    console.error(`[Mem0] Failed to initialize client for agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Initialize Mem0 and check availability.
 * Call this at startup to verify Mem0 is reachable.
 */
export async function initializeMem0(): Promise<boolean> {
  if (mem0InitAttempted) return mem0Available;
  mem0InitAttempted = true;

  const host = process.env.MEM0_URL || process.env.MEM0_HOST;
  if (!host) {
    console.warn('[Mem0] MEM0_URL not set — Mem0 disabled');
    return false;
  }

  try {
    // Create a test client and ping
    const client = new MemoryClient({
      apiKey: process.env.MEM0_API_KEY || 'mem0-self-hosted',
      host,
    });
    await client.ping();
    mem0Available = true;
    console.log(`[Mem0] Connected to Mem0 at ${host}`);
    return true;
  } catch (error: any) {
    console.warn(`[Mem0] Not available at ${host}:`, error?.message || error);
    mem0Available = false;
    return false;
  }
}

/**
 * Check if Mem0 is currently available.
 */
export function isMem0Available(): boolean {
  return mem0Available;
}

/**
 * Add memories from a conversation to Mem0.
 * Call this after each agent interaction to persist learnings.
 */
export async function addMemories(
  agentId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const client = getMem0Client(agentId);
  if (!client) return;

  try {
    await client.add(messages, { user_id: agentId });
    console.log(`[Mem0] Added ${messages.length} messages for agent ${agentId}`);
  } catch (error: any) {
    console.error(`[Mem0] Failed to add memories for ${agentId}:`, error?.message || error);
  }
}

/**
 * Search Mem0 for relevant memories based on a query.
 * Call this at the start of an agent task to retrieve relevant context.
 */
export async function searchMemories(
  agentId: string,
  query: string,
  limit: number = 5
): Promise<string[]> {
  const client = getMem0Client(agentId);
  if (!client) return [];

  try {
    const results = await client.search(query, { 
      user_id: agentId, 
      limit,
    });
    console.log(`[Mem0] Found ${results.length} memories for agent ${agentId} query: "${query}"`);
    return results.map((r: any) => r.memory || r.data?.memory || '').filter(Boolean);
  } catch (error: any) {
    console.error(`[Mem0] Failed to search memories for ${agentId}:`, error?.message || error);
    return [];
  }
}

/**
 * Get all memories for an agent (for debugging/admin).
 */
export async function getAllMemories(
  agentId: string,
  limit: number = 50
): Promise<Array<{ id: string; memory: string; created_at: Date }>> {
  const client = getMem0Client(agentId);
  if (!client) return [];

  try {
    const results = await client.getAll({ user_id: agentId, page_size: limit });
    return results.map((r: any) => ({
      id: r.id,
      memory: r.memory || r.data?.memory || '',
      created_at: r.created_at || new Date(),
    }));
  } catch (error: any) {
    console.error(`[Mem0] Failed to get all memories for ${agentId}:`, error?.message || error);
    return [];
  }
}

/**
 * Delete a specific memory by ID.
 */
export async function deleteMemory(agentId: string, memoryId: string): Promise<void> {
  const client = getMem0Client(agentId);
  if (!client) return;

  try {
    await client.delete(memoryId);
    console.log(`[Mem0] Deleted memory ${memoryId} for agent ${agentId}`);
  } catch (error: any) {
    console.error(`[Mem0] Failed to delete memory ${memoryId}:`, error?.message || error);
  }
}
