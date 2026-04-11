# Mem0 Persistent Memory Deployment

## What is Mem0?
Mem0 provides long-term memory for AI agents. It stores and retrieves semantic memories,
allowing agents to remember past interactions and learn from them.

## Deployment Options

### Option 1: Direct Docker (for testing)
```bash
cd mem0
docker-compose up -d
```

### Option 2: Coolify Deployment
Use the Coolify UI to deploy:
1. Create new "Service" 
2. Use docker-compose from this directory
3. Set environment variables as needed

## Environment Variables
- `REDIS_URL`: Redis connection string (default: redis://redis:6379)
- `DATABASE_URL`: Database connection (default: sqlite:///data/mem0.db)

## API Endpoint
After deployment: `http://<host>:5000`
