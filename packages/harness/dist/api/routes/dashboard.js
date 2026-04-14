import { prisma, isDatabaseHealthy } from '../../db/client.js';
// In-memory demo data when no database is available
const demoAgents = [
    { id: 'ceo', name: 'Nanachi (CEO)', status: 'active', role: 'Factory Coordinator', sessions: 3 },
    { id: 'cto', name: 'Hermes (CTO)', status: 'active', role: 'Technical Execution', sessions: 5 },
    { id: 'cmo', name: 'CMO', status: 'inactive', role: 'Marketing & Growth', sessions: 0 },
];
const demoStartups = [
    { id: 'startup-1', name: 'AI Code Review Assistant', stage: 'validation', progress: 25, founderBrief: 'Yev Rachkovan', lastActivity: new Date().toISOString(), needsYevInput: true },
    { id: 'startup-2', name: 'DnDate', stage: 'launch', progress: 75, founderBrief: 'Yev Rachkovan', lastActivity: new Date(Date.now() - 86400000).toISOString(), needsYevInput: false },
    { id: 'startup-3', name: 'Self-Degree Framework', stage: 'idea', progress: 10, founderBrief: 'Yev Rachkovan', lastActivity: new Date(Date.now() - 172800000).toISOString(), needsYevInput: true },
];
const demoPendingInputs = [
    { id: 'pi-1', startupId: 'startup-1', type: 'decision', message: 'Validate market need for AI code review tool', priority: 'high', createdAt: new Date().toISOString() },
    { id: 'pi-2', startupId: 'startup-2', type: 'review', message: 'Review onboarding flow UX design', priority: 'medium', createdAt: new Date(Date.now() - 3600000).toISOString() },
];
const demoSessions = [
    { id: 'session-1', agentId: 'ceo', startedAt: new Date(Date.now() - 3600000).toISOString(), status: 'active', messages: 42 },
    { id: 'session-2', agentId: 'cto', startedAt: new Date(Date.now() - 7200000).toISOString(), status: 'active', messages: 128 },
    { id: 'session-3', agentId: 'ceo', startedAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed', messages: 89 },
];
function getStageProgress(stage) {
    const stageOrder = ['idea', 'validation', 'mvp', 'launch', 'distribution', 'pmf', 'support', 'exit'];
    return Math.round(((stageOrder.indexOf(stage) + 1) / stageOrder.length) * 100);
}
/**
 * GET /dashboard
 * Returns an HTML dashboard showing:
 * - Agent status
 * - Startup progress
 * - Pending inputs for Yev
 */
export async function getDashboard(req, res) {
    const dbHealthy = await isDatabaseHealthy();
    const isDemo = !dbHealthy || !prisma;
    let agents = demoAgents;
    let startups = demoStartups;
    let pendingInputs = demoPendingInputs;
    let sessions = demoSessions;
    // Try to fetch real data from database
    if (!isDemo && prisma) {
        try {
            const [dbAgents, dbStartups, dbLifecycleEvents, dbMessages] = await Promise.all([
                prisma.agent.findMany({ orderBy: { updatedAt: 'desc' } }),
                prisma.startup.findMany({
                    orderBy: { updatedAt: 'desc' },
                    include: { _count: { select: { lifecycleEvents: true } } }
                }),
                prisma.lifecycleEvent.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { startup: true }
                }),
                prisma.agentMessage.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 100
                })
            ]);
            agents = dbAgents.map((a) => ({
                id: a.id,
                name: a.displayName || a.name,
                status: a.status || 'inactive',
                role: a.role || 'Unknown',
                sessions: 0 // Will be populated from session tracking
            }));
            startups = dbStartups.map((s) => ({
                id: s.id,
                name: s.name,
                stage: s.stage?.toLowerCase() || 'idea',
                progress: getStageProgress(s.stage?.toLowerCase() || 'idea'),
                founderBrief: s.founderBrief || '',
                lastActivity: s.updatedAt.toISOString(),
                needsYevInput: false // Default, can be enhanced with additional queries
            }));
            pendingInputs = dbLifecycleEvents
                .filter((e) => ['stage_advance', 'workflow_start', 'input_required'].includes(e.eventType))
                .map((e) => {
                const metadata = e.metadata;
                return {
                    id: e.id,
                    startupId: e.startupId,
                    type: e.eventType,
                    message: metadata?.message || `Event: ${e.eventType}`,
                    priority: metadata?.priority || 'medium',
                    createdAt: e.createdAt.toISOString()
                };
            });
            // Derive sessions from message activity
            const messageCountByAgent = {};
            for (const msg of dbMessages) {
                messageCountByAgent[msg.senderId] = (messageCountByAgent[msg.senderId] || 0) + 1;
            }
            for (const agent of agents) {
                agent.sessions = messageCountByAgent[agent.id] || 0;
            }
            sessions = Object.entries(messageCountByAgent).map(([agentId, messageCount], idx) => ({
                id: `session-${idx + 1}`,
                agentId,
                startedAt: new Date().toISOString(),
                status: 'active',
                messages: messageCount
            }));
        }
        catch (error) {
            console.error('[Dashboard] Error fetching from DB:', error);
        }
    }
    // Build HTML dashboard
    const html = generateDashboardHTML({
        agents,
        startups,
        pendingInputs,
        sessions,
        isDemo,
        dbHealthy,
        timestamp: new Date().toISOString()
    });
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}
/**
 * GET /api/dashboard/summary
 * Returns dashboard summary statistics
 */
export async function getDashboardSummary(req, res) {
    const dbHealthy = await isDatabaseHealthy();
    const isDemo = !dbHealthy || !prisma;
    // Check if we can query the DB without errors (tables might not exist)
    if (!isDemo && prisma) {
        try {
            const [agentCount, activeAgentCount, startupCount, recentEvents, messageCount] = await Promise.all([
                prisma.agent.count(),
                prisma.agent.count({ where: { status: 'active' } }),
                prisma.startup.count(),
                prisma.lifecycleEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
                prisma.agentMessage.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
            ]);
            res.json({
                totalAgents: agentCount,
                activeAgents: activeAgentCount,
                totalStartups: startupCount,
                pendingInputs: recentEvents,
                activeSessions: messageCount > 0 ? Math.ceil(messageCount / 10) : 0,
                mode: 'production',
                dbHealthy: true
            });
            return;
        }
        catch (error) {
            // Tables don't exist or other DB error — fall through to demo mode
            console.warn('[Dashboard API] DB query failed, using demo data:', error.message?.substring(0, 100));
        }
    }
    // Fallback to demo data
    res.json({
        totalAgents: demoAgents.length,
        activeAgents: demoAgents.filter(a => a.status === 'active').length,
        totalStartups: demoStartups.length,
        pendingInputs: demoPendingInputs.length,
        activeSessions: demoSessions.filter(s => s.status === 'active').length,
        mode: 'demo',
        dbHealthy: false
    });
}
/**
 * GET /api/dashboard/agents
 * Returns list of agents with their status
 */
export async function getDashboardAgents(req, res) {
    const dbHealthy = await isDatabaseHealthy();
    const isDemo = !dbHealthy || !prisma;
    if (isDemo || !prisma) {
        res.json({ agents: demoAgents, mode: 'demo' });
        return;
    }
    try {
        const agents = await prisma.agent.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json({
            agents: agents.map((a) => ({
                id: a.id,
                name: a.displayName || a.name,
                status: a.status || 'inactive',
                role: a.role || 'Unknown',
                sessions: 0
            })),
            mode: 'production'
        });
    }
    catch (error) {
        console.warn('[Dashboard API] DB query failed, using demo data:', error.message?.substring(0, 100));
        res.json({ agents: demoAgents, mode: 'demo' });
    }
}
/**
 * GET /api/dashboard/startups
 * Returns startups with stage, progress, and Yev input needed flag
 */
export async function getDashboardStartups(req, res) {
    const dbHealthy = await isDatabaseHealthy();
    const isDemo = !dbHealthy || !prisma;
    try {
        if (isDemo || !prisma) {
            res.json({ startups: demoStartups, mode: 'demo' });
            return;
        }
        const startups = await prisma.startup.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { lifecycleEvents: true, artifacts: true } },
                lifecycleEvents: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
        res.json({
            startups: startups.map((s) => {
                const lastEvent = s.lifecycleEvents[0];
                const needsYevInput = lastEvent?.eventType === 'input_required' ||
                    (lastEvent?.metadata && typeof lastEvent.metadata === 'object' && 'needsYevInput' in lastEvent.metadata);
                return {
                    id: s.id,
                    name: s.name,
                    stage: s.stage?.toLowerCase() || 'idea',
                    progress: getStageProgress(s.stage?.toLowerCase() || 'idea'),
                    founderBrief: s.founderBrief || '',
                    lastActivity: s.updatedAt.toISOString(),
                    needsYevInput: needsYevInput || false,
                    eventCount: s._count.lifecycleEvents,
                    artifactCount: s._count.artifacts
                };
            }),
            mode: 'production'
        });
    }
    catch (error) {
        console.error('[Dashboard API] Error fetching startups:', error);
        res.status(500).json({ error: 'Failed to fetch startups' });
    }
}
/**
 * GET /api/dashboard/sessions
 * Returns active sessions (derived from recent message activity)
 */
export async function getDashboardSessions(req, res) {
    const dbHealthy = await isDatabaseHealthy();
    const isDemo = !dbHealthy || !prisma;
    try {
        if (isDemo || !prisma) {
            res.json({ sessions: demoSessions, mode: 'demo' });
            return;
        }
        // Get recent messages grouped by agent
        const recentMessages = await prisma.agentMessage.findMany({
            where: {
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            orderBy: { createdAt: 'desc' }
        });
        const messagesByAgent = {};
        for (const msg of recentMessages) {
            if (!messagesByAgent[msg.senderId]) {
                messagesByAgent[msg.senderId] = [];
            }
            messagesByAgent[msg.senderId].push(msg);
        }
        const sessions = Object.entries(messagesByAgent).map(([agentId, messages], idx) => {
            const firstMsg = messages[messages.length - 1];
            const lastMsg = messages[0];
            return {
                id: `session-${idx + 1}`,
                agentId,
                startedAt: firstMsg?.createdAt.toISOString() || new Date().toISOString(),
                lastActivity: lastMsg?.createdAt.toISOString() || new Date().toISOString(),
                status: 'active',
                messageCount: messages.length
            };
        });
        res.json({ sessions, mode: 'production' });
    }
    catch (error) {
        console.error('[Dashboard API] Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
}
function generateDashboardHTML(data) {
    const stageLabels = {
        idea: '💡 Idea',
        validation: '🔬 Validation',
        mvp: '🚀 MVP',
        launch: '🎉 Launch',
        distribution: '📣 Distribution',
        pmf: '💰 PMF',
        support: '🔧 Support',
        exit: '🏁 Exit'
    };
    const stageColors = {
        idea: '#9ca3af',
        validation: '#8b5cf6',
        mvp: '#3b82f6',
        launch: '#10b981',
        distribution: '#f59e0b',
        pmf: '#ef4444',
        support: '#6b7280',
        exit: '#1f2937'
    };
    const agentStatusColors = {
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
    .yev-flag { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: #ef4444; color: #fff; margin-left: 8px; }
    
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
    
    .refresh-btn { background: #3b82f6; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .refresh-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏭 Startup Factory Dashboard</h1>
    <p class="subtitle">
      Last updated: ${data.timestamp}
      <span class="badge ${data.isDemo ? 'badge-demo' : 'badge-prod'}">${data.isDemo ? 'DEMO MODE' : 'PRODUCTION'}</span>
      <span class="badge ${data.dbHealthy ? 'badge-db' : 'badge-db-down'}">DB: ${data.dbHealthy ? 'Connected' : 'Disconnected'}</span>
      <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
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
                <span class="startup-name">${startup.name}${startup.needsYevInput ? '<span class="yev-flag">⚠️ YEV INPUT</span>' : ''}</span>
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
    
    <!-- Sessions Table -->
    <div class="card full-width">
      <div class="card-header">
        <span class="card-title">💬 Active Sessions</span>
        <span class="badge badge-db">${data.sessions.filter(s => s.status === 'active').length} Active</span>
      </div>
      <table class="sessions-table">
        <thead>
          <tr>
            <th>Session ID</th>
            <th>Agent</th>
            <th>Started At</th>
            <th>Messages</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.sessions.map(session => `
            <tr>
              <td>${session.id}</td>
              <td>${session.agentId}</td>
              <td>${new Date(session.startedAt).toLocaleString()}</td>
              <td>${session.messages || session.messageCount || 0}</td>
              <td><span class="badge ${session.status === 'active' ? 'badge-prod' : 'badge-db-down'}">${session.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
