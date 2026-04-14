/**
 * Mem0 Memory Integration
 * Provides long-term memory for AI agents using self-hosted Mem0 API.
 */
const mem0Host = process.env.MEM0_BASE_URL || process.env.MEM0_URL || process.env.MEM0_HOST;
let mem0Available = false;
let mem0InitAttempted = false;
async function mem0Request(path, body) {
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
export async function initializeMem0() {
    if (mem0InitAttempted)
        return mem0Available;
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
    }
    catch (error) {
        console.warn(`[Mem0] Not available at ${mem0Host}:`, error?.message);
    }
    mem0Available = false;
    return false;
}
export function isMem0Available() {
    return mem0Available;
}
export async function addMemories(agentId, messages) {
    if (!mem0Available || !mem0Host)
        return;
    try {
        const result = await mem0Request('/memories', {
            messages,
            user_id: agentId,
        });
        if (result.status === 'ok') {
            console.log(`[Mem0] Added ${messages.length} messages for agent ${agentId}`);
        }
        else {
            console.error(`[Mem0] Add failed:`, result.error);
        }
    }
    catch (error) {
        console.error(`[Mem0] Failed to add memories for ${agentId}:`, error?.message);
    }
}
export async function searchMemories(agentId, query, limit = 5) {
    if (!mem0Available || !mem0Host)
        return [];
    try {
        const result = await mem0Request('/search', {
            query,
            user_id: agentId,
            limit,
        });
        if (result.status === 'ok') {
            const memories = result.results?.results || [];
            console.log(`[Mem0] Found ${memories.length} memories for agent ${agentId}`);
            return memories.map((r) => r.memory || '').filter(Boolean);
        }
        return [];
    }
    catch (error) {
        console.error(`[Mem0] Failed to search memories for ${agentId}:`, error?.message);
        return [];
    }
}
export async function getAllMemories(agentId, limit = 50) {
    if (!mem0Available || !mem0Host)
        return [];
    try {
        const result = await mem0Request('/memories/all', {
            user_id: agentId,
            limit,
        });
        if (result.status === 'ok') {
            return (result.results || []).map((r) => ({
                id: r.id,
                memory: r.memory || '',
                created_at: new Date(r.created_at),
            }));
        }
        return [];
    }
    catch (error) {
        console.error(`[Mem0] Failed to get memories for ${agentId}:`, error?.message);
        return [];
    }
}
export async function deleteMemory(agentId, memoryId) {
    if (!mem0Available || !mem0Host)
        return;
    try {
        await mem0Request('/memories/delete', {
            memory_id: memoryId,
            user_id: agentId,
        });
        console.log(`[Mem0] Deleted memory ${memoryId} for agent ${agentId}`);
    }
    catch (error) {
        console.error(`[Mem0] Failed to delete memory ${memoryId}:`, error?.message);
    }
}
