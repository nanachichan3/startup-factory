# Startup Factory Harness

The core orchestration engine for the AI Startup Factory. Coordinates Temporal workflows, Langgraph expert loops, and A2A agent communication.

## Quick Start

### 1. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `TEMPORAL_ADDRESS` - Temporal Cloud namespace address
- `TEMPORAL_NAMESPACE` - Temporal Cloud namespace
- `TEMPORAL_API_KEY` - Temporal Cloud API key
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM calls
- `DATABASE_URL` - PostgreSQL connection string

### 2. Build

```bash
npm install
npm run build
```

### 3. Run

```bash
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/startups` | Create a new startup |
| GET | `/api/startups` | List all startups |
| GET | `/api/startups/:id` | Get startup details |
| PUT | `/api/startups/:id/stage` | Update startup stage |
| POST | `/api/startups/:id/execute` | Trigger expert loop workflow |
| GET | `/health` | Health check |

### Example: Create a Startup

```bash
curl -X POST http://localhost:3000/api/startups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Code Review Assistant",
    "description": "An AI-powered code review tool",
    "founderBrief": "I want to build...",
    "stage": "idea"
  }'
```

### Example: Trigger Expert Loop

```bash
curl -X POST http://localhost:3000/api/startups/startup-123/execute
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Startup Factory Harness                 │
├─────────────────────────────────────────────────────────────┤
│  Express API Server                                        │
│  ├── POST /api/startups         → Create startup            │
│  ├── GET  /api/startups         → List startups             │
│  ├── POST /api/startups/:id/execute → Trigger workflow      │
├─────────────────────────────────────────────────────────────┤
│  Temporal Cloud                                             │
│  ├── Workflow: runStartupFactoryWorkflow                    │
│  ├── Workflow: runExpertLoopWorkflow                        │
│  └── Activities: createProject, updateLifecycleStage, etc.  │
├─────────────────────────────────────────────────────────────┤
│  Langgraph Expert Loop                                      │
│  ├── Listen Node → Parse startup brief                      │
│  ├── Decide Node → Route to CTO or CMO                      │
│  ├── Delegate Node → Generate tech/GTM content              │
│  ├── Validate Node → Check output quality                   │
│  ├── Persist Node → Save artifacts                         │
│  └── Reflect Node → Decide continue/finish                  │
├─────────────────────────────────────────────────────────────┤
│  A2A Protocol                                              │
│  ├── CEO → CTO: "Build tech architecture"                   │
│  └── CEO → CMO: "Create GTM strategy"                      │
└─────────────────────────────────────────────────────────────┘
```

## Temporal Cloud Setup

1. Sign up at https://cloud.temporal.io
2. Create a free namespace
3. Get your namespace address (format: `your-name.tmprl.cloud:7233`)
4. Generate an API key from your account settings
5. Set environment variables:
   ```
   TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
   TEMPORAL_NAMESPACE=your-namespace
   TEMPORAL_API_KEY=your-api-key
   ```

## Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Or run migrations
npm run prisma:migrate
```

## Testing

```bash
# Run E2E test
npx ts-node test-e2e.ts
```

## Development

```bash
# Run in development mode
npm run dev

# Watch mode (with ts-node)
```

## Project Structure

```
packages/harness/
├── src/
│   ├── index.ts              # Main entry point
│   ├── api/
│   │   ├── server.ts         # Express server setup
│   │   └── routes/
│   │       └── startups.ts   # Startup CRUD routes
│   ├── db/
│   │   └── client.ts         # Prisma client
│   ├── temporal/
│   │   └── cloud.ts          # Temporal Cloud provider
│   ├── graph/
│   │   ├── index.ts          # Graph exports
│   │   └── expert-loop-graph.ts  # Langgraph implementation
│   ├── workflows/
│   │   ├── index.ts
│   │   ├── factory-workflow.ts
│   │   ├── expert-loop-workflow.ts
│   │   └── activities.ts
│   ├── protocol/
│   │   ├── a2a.ts
│   │   └── a2a-handler.ts
│   └── llm/
│       └── client.ts         # OpenRouter client
├── prisma/
│   └── schema.prisma         # Database schema
└── test-e2e.ts               # E2E test script
```

## License

MIT
