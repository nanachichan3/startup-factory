import { z } from 'zod';
// A2A Message Schema - validates all agent-to-agent messages
export const A2AMessageSchema = z.object({
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
const messageInbox = new Map();
const messageOutbox = new Map();
/**
 * A2A Protocol Handler Implementation
 * Handles agent-to-agent messaging for the Startup Factory
 *
 * Provides:
 * - Message validation via Zod schema
 * - In-memory message queuing
 * - Request/Response handling
 * - Error handling
 */
export class A2AProtocolHandler {
    agentId;
    messageHistory = [];
    constructor(agentId) {
        this.agentId = agentId;
        messageInbox.set(agentId, []);
        messageOutbox.set(agentId, []);
    }
    /**
     * Handle an incoming message
     */
    async handleMessage(message) {
        console.log(`[A2A:${this.agentId}] Received message from ${message.sender}:`, message.type);
        // Validate message against schema
        const parsed = A2AMessageSchema.safeParse(message);
        if (!parsed.success) {
            console.error(`[A2A:${this.agentId}] Invalid message format:`, parsed.error);
            return this.createErrorResponse(message.id, 'Invalid message format');
        }
        // Store in history
        this.messageHistory.push(message);
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
                console.warn(`[A2A:${this.agentId}] Unknown message type: ${message.type}`);
                return null;
        }
    }
    /**
     * Handle a REQUEST message
     */
    async handleRequest(message) {
        const { payload } = message;
        console.log(`[A2A:${this.agentId}] Processing request:`, payload.action);
        try {
            switch (payload.action) {
                case 'CREATE_PROJECT':
                    return this.createResponse(message, {
                        status: 'success',
                        projectId: `proj_${Date.now()}`,
                        action: 'CREATE_PROJECT',
                    });
                case 'GET_STATUS':
                    return this.createResponse(message, {
                        status: 'success',
                        agentId: this.agentId,
                        state: 'active',
                        uptime: process.uptime(),
                    });
                case 'LIST_PROJECTS':
                    return this.createResponse(message, {
                        status: 'success',
                        projects: [],
                        count: 0,
                    });
                case 'RUN_EXPERT_LOOP':
                    return this.createResponse(message, {
                        status: 'success',
                        action: 'RUN_EXPERT_LOOP',
                        loopId: `loop_${Date.now()}`,
                    });
                case 'ADVANCE_STAGE':
                    return this.createResponse(message, {
                        status: 'success',
                        action: 'ADVANCE_STAGE',
                        newStage: payload.targetStage,
                    });
                case 'PING':
                    return this.createResponse(message, {
                        status: 'pong',
                        timestamp: new Date().toISOString(),
                    });
                default:
                    return this.createResponse(message, {
                        status: 'unknown_action',
                        action: payload.action,
                        availableActions: ['CREATE_PROJECT', 'GET_STATUS', 'LIST_PROJECTS', 'RUN_EXPERT_LOOP', 'ADVANCE_STAGE', 'PING'],
                    });
            }
        }
        catch (error) {
            console.error(`[A2A:${this.agentId}] Error handling request:`, error);
            return this.createErrorResponse(message.id, String(error));
        }
    }
    /**
     * Handle a RESPONSE message
     */
    async handleResponse(message) {
        console.log(`[A2A:${this.agentId}] Received response:`, message.payload);
        // Queue the response for polling agents
        const inbox = messageInbox.get(message.sender) || [];
        inbox.push(message);
        messageInbox.set(message.sender, inbox);
        return null;
    }
    /**
     * Handle an UPDATE message
     */
    async handleUpdate(message) {
        console.log(`[A2A:${this.agentId}] Received update:`, message.payload);
        // Queue update for processing
        const inbox = messageInbox.get(this.agentId) || [];
        inbox.push(message);
        messageInbox.set(this.agentId, inbox);
        return null;
    }
    /**
     * Handle an ERROR message
     */
    async handleError(message) {
        console.error(`[A2A:${this.agentId}] Received error:`, message.payload);
        // Log error but don't respond
        return null;
    }
    /**
     * Create a response message
     */
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
    /**
     * Create an error response message
     */
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
    /**
     * Send a message to another agent
     */
    async sendMessage(message) {
        const fullMessage = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
        // Validate the message before sending
        const parsed = A2AMessageSchema.safeParse(fullMessage);
        if (!parsed.success) {
            throw new Error(`Invalid message format: ${parsed.error}`);
        }
        // Queue message for recipient
        const recipientInbox = messageInbox.get(message.recipient) || [];
        recipientInbox.push(fullMessage);
        messageInbox.set(message.recipient, recipientInbox);
        // Store in outbox for sender
        const senderOutbox = messageOutbox.get(this.agentId) || [];
        senderOutbox.push(fullMessage);
        messageOutbox.set(this.agentId, senderOutbox);
        console.log(`[A2A:${this.agentId}] Sent ${message.type} to ${message.recipient}`);
        return fullMessage;
    }
    /**
     * Register another agent handler
     */
    registerAgent(agentId, handler) {
        agentRegistry.set(agentId, handler);
        messageInbox.set(agentId, []);
        messageOutbox.set(agentId, []);
        console.log(`[A2A:${this.agentId}] Registered agent: ${agentId}`);
    }
    /**
     * Get all messages in inbox
     */
    getInbox() {
        return messageInbox.get(this.agentId) || [];
    }
    /**
     * Clear the inbox
     */
    clearInbox() {
        messageInbox.set(this.agentId, []);
    }
    /**
     * Get message history
     */
    getHistory() {
        return this.messageHistory;
    }
    /**
     * Get agent ID
     */
    getAgentId() {
        return this.agentId;
    }
}
/**
 * Factory function to create an A2A handler for an agent
 */
export function createA2AHandler(agentId) {
    return new A2AProtocolHandler(agentId);
}
/**
 * Create a message to send between agents
 */
export function createA2AMessage(sender, recipient, type, payload, metadata) {
    return {
        sender,
        recipient,
        type,
        payload,
        metadata: {
            priority: 'NORMAL',
            ...metadata,
        },
    };
}
/**
 * A2A Message Bus - central messaging hub
 */
export class A2AMessageBus {
    handlers = new Map();
    /**
     * Register an agent with the message bus
     */
    registerAgent(agentId) {
        const handler = createA2AHandler(agentId);
        this.handlers.set(agentId, handler);
        return handler;
    }
    /**
     * Get handler for an agent
     */
    getHandler(agentId) {
        return this.handlers.get(agentId);
    }
    /**
     * Send message through the bus
     */
    async send(message) {
        const sender = this.handlers.get(message.sender);
        if (!sender) {
            throw new Error(`Unknown sender: ${message.sender}`);
        }
        return sender.sendMessage(message);
    }
    /**
     * Broadcast message to multiple recipients
     */
    async broadcast(sender, recipients, type, payload) {
        const results = [];
        for (const recipient of recipients) {
            const message = createA2AMessage(sender, recipient, type, payload);
            const result = await this.send(message);
            results.push(result);
        }
        return results;
    }
}
// Export singleton message bus
export const a2aMessageBus = new A2AMessageBus();
