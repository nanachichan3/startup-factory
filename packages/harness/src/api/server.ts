import express, { Request, Response, NextFunction } from 'express';
import { createStartup, getStartup, listStartups, updateStartupStage, executeWorkflow, healthCheck } from './routes/startups.js';
import { getDashboard } from './routes/dashboard.js';
import { getDebugDb } from './routes/debug.js';

const app = express();

// Get auth credentials from environment
const AUTH_USER = process.env.HTTP_BASIC_AUTH_USER || 'admin';
const AUTH_PASS = process.env.HTTP_BASIC_AUTH_PASS || 'password';

// Basic auth middleware
function basicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Startup Factory Dashboard"');
    res.status(401).send('Authentication required');
    return;
  }
  
  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [user, password] = credentials.split(':');
  
  if (user === AUTH_USER && password === AUTH_PASS) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Startup Factory Dashboard"');
    res.status(401).send('Invalid credentials');
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Public routes
app.get('/health', healthCheck);
app.get('/debug/db', getDebugDb);

// Protected dashboard
app.get('/dashboard', basicAuth, getDashboard);

// Protected API routes
app.post('/api/startups', basicAuth, createStartup);
app.get('/api/startups', basicAuth, listStartups);
app.get('/api/startups/:id', basicAuth, getStartup);
app.put('/api/startups/:id/stage', basicAuth, updateStartupStage);
app.post('/api/startups/:id/execute', basicAuth, executeWorkflow);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;