import { prisma } from '../../db/client.js';
/**
 * GET /debug/db
 * Debug endpoint to check database connectivity
 */
export async function getDebugDb(req, res) {
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const dbUrlMasked = dbUrl.replace(/:[^:@]+@/, ':****@');
    let connectionStatus = 'unknown';
    let connectionError = null;
    // Try to connect
    if (prisma) {
        try {
            await prisma.$connect();
            connectionStatus = 'connected';
        }
        catch (error) {
            connectionStatus = 'failed';
            connectionError = error.message;
        }
    }
    else {
        connectionStatus = 'prisma not initialized';
    }
    res.json({
        databaseUrl: dbUrlMasked,
        prismaInitialized: !!prisma,
        connectionStatus,
        connectionError,
        nodeEnv: process.env.NODE_ENV,
        databaseUrlSet: !!process.env.DATABASE_URL,
    });
}
