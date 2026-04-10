import { z } from 'zod';

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

export type A2AMessage = z.infer<<typeoftypeof MessageSchema>;

export interface AgentProtocolHandler {
  handleMessage(message: A2AMessage): Promise<<AA2AMessage | null>;
}
