import { z } from 'zod';
// A2A Message Schema
export const MessageSchema = z.object({
    id: z.string().uuid(),
    sender: z.string(),
    recipient: z.string(),
    timestamp: z.string().datetime(),
    type: z.enum(['REQUEST', 'RESPONSE', 'UPDATE', 'ERROR']),
    payload: z.record(z.any()),
    metadata: z.object({
        workflowId: z.string().optional(),
        runId: z.string().optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
    }),
});
// In-memory message queue for agents
const agentRegistry = new Map();
const messageQueue = new Map();
/**
 * A2A Protocol Handler Implementation
 * Handles agent-to-agent messaging for the Startup Factory
 */
export class A2AProtocolHandler {
    agentId;
    constructor(agentId) {
        this.agentId = agentId;
        messageQueue.set(agentId, []);
    }
    async handleMessage(message) {
        console.log(`[A2A:${this.agentId}] Received message from ${message.sender}:`, message.type);
        // Validate message
        const parsed = MessageSchema.safeParse(message);
        if (!parsed.success) {
            console.error(`[A2A:${this.agentId}] Invalid message format`);
            return this.createErrorResponse(message.id, 'Invalid message format');
        }
        // Route based on message type
        switch (message.type) {
            case 'REQUEST':
                return this.handleRequest(message);
            case 'RESPONSE':
                return this.handleResponse(message);
            case 'UPDATE':
                return this.handleUpdate(message);
            case 'ERROR':
                return this.handleError(message);
            default:
                return null;
        }
    }
    async handleRequest(message) {
        const { payload } = message;
        console.log(`[A2A:${this.agentId}] Processing request:`, payload.action);
        // Process based on action type
        switch (payload.action) {
            case 'CREATE_PROJECT':
                return this.createResponse(message, {
                    status: 'success',
                    projectId: `proj_${Date.now()}`,
                });
            case 'GET_STATUS':
                return this.createResponse(message, {
                    status: 'success',
                    agentId: this.agentId,
                    state: 'active',
                });
            default:
                return this.createResponse(message, {
                    status: 'unknown_action',
                    action: payload.action,
                });
        }
    }
    async handleResponse(message) {
        console.log(`[A2A:${this.agentId}] Received response:`, message.payload);
        // Queue the response for polling agents
        return null;
    }
    async handleUpdate(message) {
        console.log(`[A2A:${this.agentId}] Received update:`, message.payload);
        return null;
    }
    async handleError(message) {
        console.error(`[A2A:${this.agentId}] Received error:`, message.payload);
        return null;
    }
    createResponse(request, payload) {
        return {
            id: crypto.randomUUID(),
            sender: this.agentId,
            recipient: request.sender,
            timestamp: new Date().toISOString(),
            type: 'RESPONSE',
            payload,
            metadata: {
                workflowId: request.metadata.workflowId,
                runId: request.metadata.runId,
                priority: 'NORMAL',
            },
        };
    }
    createErrorResponse(originalId, error) {
        return {
            id: crypto.randomUUID(),
            sender: this.agentId,
            recipient: 'unknown',
            timestamp: new Date().toISOString(),
            type: 'ERROR',
            payload: { error, originalMessageId: originalId },
            metadata: { priority: 'HIGH' },
        };
    }
    async sendMessage(message) {
        const fullMessage = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
        // Queue message for recipient
        const recipientQueue = messageQueue.get(message.recipient) || [];
        recipientQueue.push(fullMessage);
        messageQueue.set(message.recipient, recipientQueue);
        console.log(`[A2A:${this.agentId}] Sent message to ${message.recipient}`);
        return fullMessage;
    }
    registerAgent(agentId, handler) {
        agentRegistry.set(agentId, handler);
        messageQueue.set(agentId, []);
    }
    // Poll for messages (for async message retrieval)
    pollMessages() {
        const messages = messageQueue.get(this.agentId) || [];
        messageQueue.set(this.agentId, []);
        return messages;
    }
}
// Factory function
export function createA2AHandler(agentId) {
    return new A2AProtocolHandler(agentId);
}
