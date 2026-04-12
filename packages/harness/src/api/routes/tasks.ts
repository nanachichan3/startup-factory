import { Request, Response } from 'express';
import { prisma } from '../db/client.js';

export async function listTasks(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const { status, assignee, phase, priority } = req.query;
    
    const where: any = {};
    if (status) where.status = String(status);
    if (assignee) where.assignee = String(assignee);
    if (phase) where.phase = String(phase);
    if (priority) where.priority = String(priority);

    const tasks = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "tasks" WHERE 1=1
       ${status ? ` AND status = '${status}'` : ''}
       ${assignee ? ` AND assignee = '${assignee}'` : ''}
       ${phase ? ` AND phase = '${phase}'` : ''}
       ${priority ? ` AND priority = '${priority}'` : ''}
       ORDER BY 
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
         "createdAt" DESC`
    );

    res.json({ tasks, count: tasks.length });
  } catch (error: any) {
    console.error('[Tasks] List error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getTask(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const { id } = req.params;
    const task = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "tasks" WHERE id = $1`,
      id
    );

    if (!task || task.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task: task[0] });
  } catch (error: any) {
    console.error('[Tasks] Get error:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const { id } = req.params;
    const { status, assignee } = req.body;

    if (!status && !assignee) {
      res.status(400).json({ error: 'Must provide status and/or assignee to update' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (assignee !== undefined) {
      updates.push(`assignee = $${paramIndex++}`);
      values.push(assignee);
    }
    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    const result = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE "tasks" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      ...values
    );

    if (!result || result.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task: result[0] });
  } catch (error: any) {
    console.error('[Tasks] Update error:', error);
    res.status(500).json({ error: error.message });
  }
}
