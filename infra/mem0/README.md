# Mem0 Self-Hosted Deployment

Mem0 provides a self-hostable memory layer for AI agents. This deployment includes the full stack: Mem0 API server, PostgreSQL with pgvector (for embeddings), and Neo4j (for graph relationships).

## Architecture

```
┌─────────────┐     ┌──────────────────┐
│   Mem0 API  │────▶│  PostgreSQL +    │
│  (FastAPI)  │     │   pgvector       │
│   :8888     │     │   :5432          │
└─────────────┘     └──────────────────┘
        │
        ▼
┌─────────────┐
│   Neo4j     │
│  (Graph)    │
│   :7687     │
└─────────────┘
```

## Quick Start

1. Create a `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

2. Start the stack:
   ```bash
   docker compose up -d
   ```

3. Verify Mem0 is running:
   ```bash
   curl http://localhost:8888/v1/health
   ```

## Endpoints

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Mem0 API | 8888 | 8888 | http://localhost:8888 |
| PostgreSQL | 5432 | 5433 | localhost:5433 |
| Neo4j HTTP | 7474 | 7475 | http://localhost:7475 |
| Neo4j Bolt | 7687 | 7690 | bolt://localhost:7690 |

## API Usage

### Add Memory
```bash
curl -X POST http://localhost:8888/v1/memories \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "alice",
    "messages": [{"role": "user", "content": "I love hiking in the Rockies"}]
  }'
```

### Search Memory
```bash
curl "http://localhost:8888/v1/memories?user_id=alice&limit=5"
```

### Search (OpenAI-compatible API)
```bash
curl -X POST http://localhost:8888/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What does Alice like?", "user_id": "alice"}'
```

## Connecting from Factory Harness

Set in harness environment:
```
MEM0_URL=http://mem0:8888
MEM0_API_KEY=<any-string-for-self-hosted>
```

The Mem0 service should be on the same Docker network as the factory harness.

## Troubleshooting

### Mem0 container keeps exiting
- Check logs: `docker compose logs mem0`
- Verify PostgreSQL is healthy: `docker compose ps postgres`
- Verify Neo4j is healthy: `docker compose ps neo4j`

### API returns 500 errors
- Check Mem0 logs for database connection errors
- Ensure OPENAI_API_KEY is set (required for embeddings)

### Slow startup
- First run pulls ~500MB images, allow 2-5 minutes
- PostgreSQL with pgvector can take 30-60s to initialize

## Production Considerations

- Change default Neo4j password
- Use a managed PostgreSQL for production
- Add authentication to Mem0 API
- Set up backups for pgvector and Neo4j volumes
