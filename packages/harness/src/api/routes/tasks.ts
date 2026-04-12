import { Request, Response } from 'express';
import { prisma } from '../../db/client.js';

export async function seedDatabase(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const results: any = {};

    // Seed startups
    const startupCount = await prisma.startup.count();
    results.startupCount = startupCount;
    if (startupCount === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "startups" (id, name, description, "founderBrief", stage, "createdAt", "updatedAt")
        VALUES 
          ('startup-dndate', 'DnDate', 'Dating app through role-playing', 'Yev Rachkovan', 'Validation', NOW(), NOW()),
          ('startup-selfdegree', 'Self-Degree Framework', 'Book and movement on self-directed education', 'Yev Rachkovan', 'MVP', NOW(), NOW()),
          ('startup-aicodereview', 'AI Code Review Assistant', 'AI-powered code review tool for startup teams', 'Yev Rachkovan', 'Ideation', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      results.startupsSeeded = true;
    }

    // Seed tasks
    const taskCount = await prisma.task.count();
    results.taskCount = taskCount;
    if (taskCount === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "tasks" (id, title, description, priority, status, assignee, phase, "estimateMinutes", "createdAt", "updatedAt")
        VALUES 
          ('task-001', 'Define DnDate core value proposition', 'Identify the unique angle: role-playing dating. Target users who want more authentic connections.', 'high', 'in_progress', 'ceo', 'phase1', 60, NOW(), NOW()),
          ('task-002', 'Create DnDate MVP scope document', 'Outline must-have features for role-playing dating MVP: profiles, role scenarios, matching.', 'high', 'todo', 'cto', 'phase1', 45, NOW(), NOW()),
          ('task-003', 'Design DnDate user onboarding flow', 'Map out the experience from signup to first role-play date.', 'medium', 'todo', 'cmo', 'phase1', 30, NOW(), NOW()),
          ('task-004', 'Build DnDate user profile system', 'Create profile structure supporting role-play preferences and personality tags.', 'high', 'todo', 'cto', 'phase2', 120, NOW(), NOW()),
          ('task-005', 'Develop DnDate matching algorithm', 'Build compatibility scoring based on role-play style and relationship goals.', 'high', 'todo', 'cto', 'phase2', 180, NOW(), NOW()),
          ('task-006', 'Write Self-Degree Chapter 1 draft', 'Complete first chapter on the philosophy of self-directed education.', 'high', 'completed', 'ceo', 'phase1', 120, NOW(), NOW()),
          ('task-007', 'Design Self-Degree book cover concept', 'Create visual identity for the book and accompanying movement.', 'medium', 'in_progress', 'cmo', 'phase1', 60, NOW(), NOW()),
          ('task-008', 'Plan Self-Degree launch strategy', 'Map out pre-launch community building and early adopter acquisition.', 'medium', 'todo', 'cmo', 'phase2', 90, NOW(), NOW()),
          ('task-009', 'Create Self-Degree reader community', 'Set up community channel for early readers to engage.', 'medium', 'todo', 'cmo', 'phase2', 45, NOW(), NOW()),
          ('task-010', 'Define AI Code Review tool requirements', 'Document core features: PR integration, inline comments, suggested fixes.', 'high', 'todo', 'cto', 'phase1', 60, NOW(), NOW()),
          ('task-011', 'Build AI Code Review MVP', 'Create a CLI tool that accepts a diff and returns AI-powered review comments.', 'high', 'todo', 'cto', 'phase2', 240, NOW(), NOW()),
          ('task-012', 'Integrate AI Code Review with GitHub Actions', 'Build GitHub Action workflow for automated code review on PRs.', 'high', 'todo', 'cto', 'phase2', 120, NOW(), NOW()),
          ('task-013', 'Write AI Code Review landing page', 'Create marketing page highlighting time savings and quality improvements.', 'medium', 'todo', 'cmo', 'phase3', 60, NOW(), NOW()),
          ('task-014', 'Analyze DnDate competitor landscape', 'Research existing role-playing and niche dating apps.', 'medium', 'completed', 'ceo', 'phase1', 45, NOW(), NOW()),
          ('task-015', 'Draft DnDate monetization model', 'Explore freemium, subscription, and premium feature unlock options.', 'medium', 'todo', 'ceo', 'phase2', 60, NOW(), NOW()),
          ('task-016', 'Set up Self-Degree website', 'Create landing page for the book with newsletter signup.', 'medium', 'in_progress', 'cto', 'phase1', 90, NOW(), NOW()),
          ('task-017', 'Write Self-Degree reader survey', 'Design survey to gather early feedback on book concepts.', 'medium', 'todo', 'ceo', 'phase1', 30, NOW(), NOW()),
          ('task-018', 'Create AI Code Review demo video', 'Record and edit a short demo showing the tool in action.', 'medium', 'todo', 'cmo', 'phase3', 120, NOW(), NOW()),
          ('task-019', 'Draft DnDate pitch deck slide 1-5', 'Create initial slides covering problem, solution, and market opportunity.', 'medium', 'todo', 'ceo', 'phase3', 90, NOW(), NOW()),
          ('task-020', 'Set up DnDate analytics tracking', 'Instrument the app to track user engagement and conversion funnels.', 'medium', 'todo', 'cto', 'phase2', 60, NOW(), NOW()),
          ('task-021', 'Write Self-Degree chapter 2 outline', 'Expand the book structure with chapter 2 on learning ecosystems.', 'medium', 'todo', 'ceo', 'phase2', 45, NOW(), NOW()),
          ('task-022', 'Research AI Code Review pricing models', 'Analyze competitor pricing for similar developer tools.', 'low', 'todo', 'ceo', 'phase2', 45, NOW(), NOW()),
          ('task-023', 'Create DnDate brand guidelines', 'Define voice, tone, and visual identity for the app.', 'low', 'todo', 'cmo', 'phase2', 60, NOW(), NOW()),
          ('task-024', 'Build Self-Degree email course', 'Create 5-email drip sequence to nurture book readers.', 'medium', 'todo', 'cmo', 'phase3', 120, NOW(), NOW()),
          ('task-025', 'Design AI Code Review dashboard', 'Mock up the web dashboard showing review history and team metrics.', 'medium', 'todo', 'cto', 'phase3', 90, NOW(), NOW()),
          ('task-026', 'Write DnDate waitlist landing page', 'Create pre-launch page with email capture.', 'high', 'todo', 'cmo', 'phase2', 60, NOW(), NOW()),
          ('task-027', 'Plan DnDate beta testing program', 'Design beta cohort structure and feedback collection process.', 'medium', 'todo', 'ceo', 'phase3', 90, NOW(), NOW()),
          ('task-028', 'Set up AI Code Review GitHub repository', 'Initialize repo with README, CI, and contribution guidelines.', 'high', 'completed', 'cto', 'phase1', 30, NOW(), NOW()),
          ('task-029', 'Create Self-Degree social media presence', 'Set up Twitter/LinkedIn accounts and first content plan.', 'medium', 'todo', 'cmo', 'phase2', 60, NOW(), NOW()),
          ('task-030', 'Review DnDate technical architecture', 'Audit proposed stack and identify scalability risks.', 'medium', 'todo', 'cto', 'phase2', 90, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      results.tasksSeeded = true;
    }

    res.json({ success: true, ...results });
  } catch (error: any) {
    console.error('[Seed] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

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

    const tasks = await prisma.$queryRawUnsafe(
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
    const task = await prisma.$queryRawUnsafe(
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

    const result = await prisma.$queryRawUnsafe(
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
