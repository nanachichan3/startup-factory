import { Request, Response } from 'express';
import { prisma, isDatabaseHealthy, STARTUP_STAGES } from '../../db/client.js';

// In-memory demo data when no database is available
const demoAgents = [
  { id: 'ceo', name: 'Nanachi (CEO)', status: 'active', role: 'Factory Coordinator', sessions: 3 },
  { id: 'cto', name: 'Hermes (CTO)', status: 'active', role: 'Technical Execution', sessions: 5 },
  { id: 'cmo', name: 'CMO', status: 'inactive', role: 'Marketing & Growth', sessions: 0 },
];

const demoStartups = [
  { id: 'startup-1', name: 'AI Code Review Assistant', stage: 'validation', progress: 25, founderBrief: 'Yev Rachkovan', lastActivity: new Date().toISOString() },
  { id: 'startup-2', name: 'DnDate', stage: 'launch', progress: 75, founderBrief: 'Yev Rachkovan', lastActivity: new Date(Date.now() - 86400000).toISOString() },
  { id: 'startup-3', name: 'Self-Degree Framework', stage: 'idea', progress: 10, founderBrief: 'Yev Rachkovan', lastActivity: new Date(Date.now() - 172800000).toISOString() },
];

const demoPendingInputs = [
  { id: 'pi-1', startupId: 'startup-1', type: 'decision', message: 'Validate market need for AI code review tool', priority: 'high', createdAt: new Date().toISOString() },
  { id: 'pi-2', startupId: 'startup-2', type: 'review', message: 'Review onboarding flow UX design', priority: 'medium', createdAt: new Date(Date.now() - 3600000).toISOString() },
];

/**
 * GET /dashboard
 * Returns an HTML dashboard showing:
 * - Agent status
 * - Startup progress
 * - Pending inputs for Yev
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  const dbHealthy = await isDatabaseHealthy();
  const isDemo = !dbHealthy || !prisma;
  
  let agents = demoAgents;
  let startups = demoStartups;
  let pendingInputs = demoPendingInputs;
  
  // Try to fetch real data from database
  if (!isDemo && prisma) {
    try {
      const [dbAgents, dbStartups, dbLifecycleEvents] = await Promise.all([
        prisma.agent.findMany({ orderBy: { updatedAt: 'desc' } }),
        prisma.startup.findMany({ 
          orderBy: { updatedAt: 'desc' },
          include: { _count: { select: { lifecycleEvents: true } } }
        }),
        // Get recent lifecycle events as "pending inputs"
        prisma.lifecycleEvent.findMany({ 
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { startup: true }
        })
      ]);
      
      agents = dbAgents.map((a: { id: string; name: string; status: string; role: string }) => ({
        id: a.id,
        name: a.name,
        status: a.status || 'inactive',
        role: a.role || 'Unknown',
        sessions: 0
      }));
      
      startups = dbStartups.map((s: { id: string; name: string; stage: string; founderBrief: string; updatedAt: Date }) => ({
        id: s.id,
        name: s.name,
        stage: s.stage,
        progress: getStageProgress(s.stage),
        founderBrief: s.founderBrief || '',
        lastActivity: s.updatedAt.toISOString()
      }));
      
      pendingInputs = dbLifecycleEvents
        .filter((e: { eventType: string }) => ['stage_advance', 'workflow_start', 'input_required'].includes(e.eventType))
        .map((e: { id: string; startupId: string; eventType: string; metadata: any; createdAt: Date; startup: any }) => ({
          id: e.id,
          startupId: e.startupId,
          type: e.eventType,
          message: e.metadata?.message || `Event: ${e.eventType}`,
          priority: e.metadata?.priority || 'medium',
          createdAt: e.createdAt.toISOString()
        }));
      
    } catch (error) {
      console.error('[Dashboard] Error fetching from DB:', error);
    }
  }
  
  // Build HTML dashboard
  const html = generateDashboardHTML({
    agents,
    startups,
    pendingInputs,
    isDemo,
    dbHealthy,
    timestamp: new Date().toISOString()
  });
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

function getStageProgress(stage: string): number {
  const stages = ['idea', 'validation', 'mvp', 'launch', 'distribution', 'pmf', 'support', 'exit'];
  return Math.round(((stages.indexOf(stage) + 1) / stages.length) * 100);
}

function generateDashboardHTML(data: {
  agents: any[],
  startups: any[],
  pendingInputs: any[],
  isDemo: boolean,
  dbHealthy: boolean,
  timestamp: string
}): string {
  const stageLabels: Record<string, string> = {
    idea: '💡 Idea',
    validation: '🔬 Validation',
    mvp: '🚀 MVP',
    launch: '🎉 Launch',
    distribution: '📣 Distribution',
    pmf: '💰 PMF',
    support: '🔧 Support',
    exit: '🏁 Exit'
  };
  
  const stageColors: Record<string, string> = {
    idea: '#9ca3af',
    validation: '#8b5cf6',
    mvp: '#3b82f6',
    launch: '#10b981',
    distribution: '#f59e0b',
    pmf: '#ef4444',
    support: '#6b7280',
    exit: '#1f2937'
  };
  
  const agentStatusColors: Record<string, string> = {
    active: '#10b981',
    inactive: '#6b7280',
    busy: '#f59e0b'
  };
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Startup Factory Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 1.8rem; font-weight: 600; margin-bottom: 8px; color: #f1f5f9; }
    .subtitle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
    .badge-demo { background: #f59e0b; color: #000; }
    .badge-prod { background: #10b981; color: #fff; }
    .badge-db { background: #3b82f6; color: #fff; }
    .badge-db-down { background: #ef4444; color: #fff; }
    
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-title { font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .agent-list { display: flex; flex-direction: column; gap: 12px; }
    .agent-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #0f172a; border-radius: 8px; }
    .agent-avatar { width: 40px; height: 40px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem; }
    .agent-info { flex: 1; }
    .agent-name { font-weight: 500; color: #f1f5f9; }
    .agent-role { font-size: 0.8rem; color: #64748b; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; }
    
    .startup-list { display: flex; flex-direction: column; gap: 12px; }
    .startup-item { padding: 16px; background: #0f172a; border-radius: 8px; }
    .startup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .startup-name { font-weight: 500; color: #f1f5f9; }
    .stage-badge { font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; color: #fff; }
    .progress-bar { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
    .progress-label { font-size: 0.75rem; color: #64748b; margin-top: 6px; }
    
    .input-list { display: flex; flex-direction: column; gap: 12px; }
    .input-item { padding: 16px; background: #0f172a; border-radius: 8px; border-left: 3px solid; }
    .input-item.high { border-color: #ef4444; }
    .input-item.medium { border-color: #f59e0b; }
    .input-item.low { border-color: #10b981; }
    .input-type { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .input-message { color: #e2e8f0; font-size: 0.9rem; margin-bottom: 8px; }
    .input-meta { font-size: 0.75rem; color: #64748b; }
    .priority-high { color: #ef4444; }
    .priority-medium { color: #f59e0b; }
    .priority-low { color: #10b981; }
    
    .full-width { grid-column: 1 / -1; }
    .two-col { grid-column: span 2; }
    
    h2 { font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #f1f5f9; }
    .sessions-table { width: 100%; border-collapse: collapse; }
    .sessions-table th, .sessions-table td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    .sessions-table th { color: #64748b; font-weight: 500; font-size: 0.8rem; text-transform: uppercase; }
    .sessions-table td { color: #e2e8f0; }
    .sessions-table tr:hover { background: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏭 Startup Factory Dashboard</h1>
    <p class="subtitle">
      Last updated: ${data.timestamp}
      <span class="badge ${data.isDemo ? 'badge-demo' : 'badge-prod'}">${data.isDemo ? 'DEMO MODE' : 'PRODUCTION'}</span>
      <span class="badge ${data.dbHealthy ? 'badge-db' : 'badge-db-down'}">DB: ${data.dbHealthy ? 'Connected' : 'Disconnected'}</span>
    </p>
    
    <div class="grid">
      <!-- Agents Status -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🤖 Agent Status</span>
          <span class="badge ${data.agents.filter(a => a.status === 'active').length > 0 ? 'badge-prod' : 'badge-db-down'}">
            ${data.agents.filter(a => a.status === 'active').length}/${data.agents.length} Active
          </span>
        </div>
        <div class="agent-list">
          ${data.agents.map(agent => `
            <div class="agent-item">
              <div class="agent-avatar">${agent.name.charAt(0)}</div>
              <div class="agent-info">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-role">${agent.role}</div>
              </div>
              <div class="status-dot" style="background: ${agentStatusColors[agent.status] || '#6b7280'}"></div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Startup Progress -->
      <div class="card two-col">
        <div class="card-header">
          <span class="card-title">🚀 Startup Progress</span>
          <span class="badge badge-db">${data.startups.length} Projects</span>
        </div>
        <div class="startup-list">
          ${data.startups.map(startup => `
            <div class="startup-item">
              <div class="startup-header">
                <span class="startup-name">${startup.name}</span>
                <span class="stage-badge" style="background: ${stageColors[startup.stage] || '#6b7280'}">${stageLabels[startup.stage] || startup.stage}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${startup.progress}%; background: ${stageColors[startup.stage] || '#6b7280'}"></div>
              </div>
              <div class="progress-label">${startup.progress}% complete • ${startup.founderBrief}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Pending Inputs -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">⚠️ Your Input Required</span>
          <span class="badge badge-db-down">${data.pendingInputs.length} Pending</span>
        </div>
        <div class="input-list">
          ${data.pendingInputs.length === 0 ? '<p style="color: #64748b; text-align: center; padding: 20px;">No pending inputs!</p>' : ''}
          ${data.pendingInputs.map(input => `
            <div class="input-item ${input.priority}">
              <div class="input-type">${input.type}</div>
              <div class="input-message">${input.message}</div>
              <div class="input-meta">
                <span class="priority-${input.priority}">${input.priority.toUpperCase()}</span> • ${new Date(input.createdAt).toLocaleString()}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}