import express from 'express';
import { createStartup, getStartup, listStartups, updateStartupStage, executeWorkflow, healthCheck } from './routes/startups.js';
import { getDashboard, getDashboardSummary, getDashboardAgents, getDashboardStartups, getDashboardSessions } from './routes/dashboard.js';
import { getDebugDb } from './routes/debug.js';
import { listTasks, getTask, updateTask, seedDatabase } from './routes/tasks.js';
const app = express();
// Get dashboard auth credentials from environment
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'password';
// Basic auth middleware for dashboard
function dashboardAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Startup Factory Dashboard"');
        res.status(401).send('Authentication required');
        return;
    }
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [user, password] = credentials.split(':');
    if (user === DASHBOARD_USER && password === DASHBOARD_PASS) {
        next();
    }
    else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Startup Factory Dashboard"');
        res.status(401).send('Invalid credentials');
    }
}
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Request logging
app.use((req, _res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
});
// Public routes
app.get('/health', healthCheck);
app.get('/debug/db', getDebugDb);
// Protected dashboard routes
app.get('/dashboard', dashboardAuth, getDashboard);
app.get('/api/dashboard/summary', dashboardAuth, getDashboardSummary);
app.get('/api/dashboard/agents', dashboardAuth, getDashboardAgents);
app.get('/api/dashboard/startups', dashboardAuth, getDashboardStartups);
app.get('/api/dashboard/sessions', dashboardAuth, getDashboardSessions);
// Protected API routes
app.post('/api/startups', dashboardAuth, createStartup);
app.get('/api/startups', dashboardAuth, listStartups);
app.get('/api/startups/:id', dashboardAuth, getStartup);
app.put('/api/startups/:id/stage', dashboardAuth, updateStartupStage);
app.post('/api/startups/:id/execute', dashboardAuth, executeWorkflow);
// Tasks API
app.get('/api/tasks', dashboardAuth, listTasks);
app.get('/api/tasks/:id', dashboardAuth, getTask);
app.patch('/api/tasks/:id', dashboardAuth, updateTask);
app.post('/api/seed', dashboardAuth, seedDatabase);
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
export default app;
