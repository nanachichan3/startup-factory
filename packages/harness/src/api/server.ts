import express, { Request, Response, NextFunction } from 'express';
import { createStartup, getStartup, listStartups, updateStartupStage, executeWorkflow, healthCheck } from './routes/startups.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', healthCheck);

// Startup CRUD routes
app.post('/api/startups', createStartup);
app.get('/api/startups', listStartups);
app.get('/api/startups/:id', getStartup);
app.put('/api/startups/:id/stage', updateStartupStage);

// Workflow trigger
app.post('/api/startups/:id/execute', executeWorkflow);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
