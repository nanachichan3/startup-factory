import { Request, Response } from 'express';
import { prisma, isDatabaseHealthy } from '../../db/client.js';

/**
 * GET /debug/db
 * Debug endpoint to check database connectivity
 */
export async function getDebugDb(req: Request, res: Response): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const dbUrlMasked = dbUrl.replace(/:[^:@]+@/, ':****@');
  
  let connectionStatus = 'unknown';
  let connectionError = null;
  
  // Try to connect
  if (prisma) {
    try {
      await prisma.$connect();
      connectionStatus = 'connected';
    } catch (error: any) {
      connectionStatus = 'failed';
      connectionError = error.message;
    }
  } else {
    connectionStatus = 'prisma not initialized';
  }
  
  res.json({
    databaseUrl: dbUrlMasked,
    prismaInitialized: !!prisma,
    connectionStatus,
    connectionError,
    env NODE_ENV: process.env.NODE_ENV,
    env DATABASE_URL_set: !!process.env.DATABASE_URL,
  });
}