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

export type A2AMessage = z.infer<typeof MessageSchema>;

// Agent Protocol Handler Interface
export interface AgentProtocolHandler {
  handleMessage(message: A2AMessage): Promise<A2AMessage | null>;
  sendMessage(message: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage>;
  registerAgent(agentId: string, handler: AgentProtocolHandler): void;
}

// In-memory message queue for agents
const agentRegistry: Map<string, AgentProtocolHandler> = new Map();
const messageQueue: Map<string, A2AMessage[]> = new Map();

/**
 * A2A Protocol Handler Implementation
 * Handles agent-to-agent messaging for the Startup Factory
 */
export class A2AProtocolHandler implements AgentProtocolHandler {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
    messageQueue.set(agentId, []);
  }

  async handleMessage(message: A2AMessage): Promise<A2AMessage | null> {
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

  private async handleRequest(message: A2AMessage): Promise<A2AMessage | null> {
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

  private async handleResponse(message: A2AMessage): Promise<A2AMessage | null> {
    console.log(`[A2A:${this.agentId}] Received response:`, message.payload);
    // Queue the response for polling agents
    return null;
  }

  private async handleUpdate(message: A2AMessage): Promise<A2AMessage | null> {
    console.log(`[A2A:${this.agentId}] Received update:`, message.payload);
    return null;
  }

  private async handleError(message: A2AMessage): Promise<A2AMessage | null> {
    console.error(`[A2A:${this.agentId}] Received error:`, message.payload);
    return null;
  }

  private createResponse(request: A2AMessage, payload: Record<string, any>): A2AMessage {
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

  private createErrorResponse(originalId: string, error: string): A2AMessage {
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

  async sendMessage(message: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage> {
    const fullMessage: A2AMessage = {
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

  registerAgent(agentId: string, handler: AgentProtocolHandler): void {
    agentRegistry.set(agentId, handler);
    messageQueue.set(agentId, []);
  }

  // Poll for messages (for async message retrieval)
  pollMessages(): A2AMessage[] {
    const messages = messageQueue.get(this.agentId) || [];
    messageQueue.set(this.agentId, []);
    return messages;
  }
}

// Factory function
export function createA2AHandler(agentId: string): A2AProtocolHandler {
  return new A2AProtocolHandler(agentId);
}
