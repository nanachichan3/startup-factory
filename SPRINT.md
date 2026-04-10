# Startup Factory Sprint — April 10, 2026

**GOAL:** Launch-ready Startup Factory by 09:00 UTC April 11
**TIMEBOX:** 30 minutes per subtask

---

## PHASE 1: Core Harness (30min each)

### 1.1 Temporal Workflow Implementation
**Timebox:** 30 min
**Acceptance:** `packages/harness/src/workflows/expert-loop-workflow.ts` exists, compiles, and can be triggered
```
Criteria:
- workflow.ts exports a workflow function
- Uses @temporalio/client decorators
- Connects to PostgreSQL for state persistence
- Has at least one activity (e.g., "process_task")
```

### 1.2 Langgraph Expert Loop Graph
**Timebox:** 30 min
**Acceptance:** `packages/harness/src/graph/expert-loop-graph.ts` implements the 6-node loop
```
Criteria:
- Nodes: listen, decide, delegate, validate, persist, reflect
- Edges connect all nodes correctly
- Graph compiles without errors
- State managed via Langgraph StateGraph
```

### 1.3 A2A Message Handler
**Timebox:** 30 min
**Acceptance:** `packages/harness/src/protocol/a2a-handler.ts` processes messages
```
Criteria:
- Can send/receive A2A messages between CEO, CTO, CMO
- Message queue or inbox implemented (can be in-memory for MVP)
- Validates messages against the Zod schema
```

---

## PHASE 2: Infrastructure (30min each)

### 2.1 Docker Containerization
**Timebox:** 30 min
**Acceptance:** `docker/Dockerfile` and `docker/docker-compose.yml` exist and build
```
Criteria:
- Dockerfile builds successfully
- docker-compose up starts the service
- Environment variables documented in .env.requirements
```

### 2.2 Coolify Deployment
**Timebox:** 30 min
**Acceptance:** Deployed to Coolify and accessible via public URL
```
Criteria:
- coolify app list shows the service running
- Temporal UI accessible at public URL
- Health check passes
```

### 2.3 IaaC (Pulumi/K3s)
**Timebox:** 30 min
**Acceptance:** `infra/` contains K3s/Traefik configuration
```
Criteria:
- k3s deployment manifest OR
- Pulumi stack OR
- Coolify one-click deploy config
```

---

## PHASE 3: Global Tools & Skills (30min each)

### 3.1 OpenRouter LLM Client
**Timebox:** 30 min
**Acceptance:** LLM client can make API calls
```
Criteria:
- openRouterClient configured in src/llm/
- Can make a test API call
- API key loaded from environment
```

### 3.2 CTO Skills Definition
**Timebox:** 30 min
**Acceptance:** `packages/skills/ctoskills.md` lists all CTO skills
```
Criteria:
- Lists all skills from the document (frontend-design, shadcn, coolify-manager, etc.)
- Each skill has a link or description
- File committed to repo
```

### 3.3 CMO Skills Definition
**Timebox:** 30 min
**Acceptance:** `packages/skills/cmoskills.md` lists all CMO skills
```
Criteria:
- Lists all skills from the document (remotion-best-practices, marketingskills, etc.)
- Each skill has a link or description
- File committed to repo
```

---

## PHASE 4: Startup Template (30min each)

### 4.1 CI/CD Workflow
**Timebox:** 30 min
**Acceptance:** `.github/workflows/ci.yml` exists and functional
```
Criteria:
- On push: lint + build + test
- Uses Node.js/TypeScript stack
- Committed to startup-template
```

### 4.2 Docker Configuration
**Timebox:** 30 min
**Acceptance:** `docker-compose.yml` in startup-template
```
Criteria:
- Services: app, database
- Builds from local Dockerfile
- Networks configured
```

### 4.3 Package Structure Implementation
**Timebox:** 30 min
**Acceptance:** `packages/configurations/` and `packages/schemas/` have code
```
Criteria:
- @startup/config package with brand defaults
- @startup/schemas package with TypeScript interfaces
- Both publishable
```

---

## PHASE 5: Documentation (30min each)

### 5.1 Startup Factory README
**Timebox:** 30 min
**Acceptance:** `startup-factory/README.md` complete
```
Criteria:
- What it is + why it exists
- Architecture overview
- Quick start (3 steps)
- Links to key files
```

### 5.2 Startup Template README
**Timebox:** 30 min
**Acceptance:** `startup-template/README.md` complete
```
Criteria:
- How to use this template
- Directory structure explanation
- How to customize (name, logo, etc.)
- Deployment instructions
```

### 5.3 Quick Start Guide
**Timebox:** 30 min
**Acceptance:** `docs/quick-start.md` in startup-factory
```
Criteria:
- Step 1: Clone repos
- Step 2: Configure environment
- Step 3: Deploy to Coolify
- Step 4: Run first startup
```

---

## VERIFICATION CHECKLIST

Before marking ANY task DONE, verify:
- [ ] Code compiles (`npm run build` or `tsc --noEmit`)
- [ ] Code is committed (`git log --oneline`)
- [ ] Code is pushed (`git push origin main`)

---

## PRIORITY ORDER

1. 1.1 Temporal Workflow (BLOCKER - nothing works without this)
2. 1.2 Langgraph Graph (BLOCKER - core logic)
3. 2.1 Docker (BLOCKER - can't deploy)
4. 2.2 Coolify Deploy (DEPENDENCY: 2.1)
5. 1.3 A2A Handler (DEPENDENCY: 1.1, 1.2)
6. 3.1 OpenRouter (DEPENDENCY: 1.1)
7. 4.1 CI/CD
8. 4.2 Docker Config
9. 4.3 Package Structure
10. 3.2 CTO Skills
11. 3.3 CMO Skills
12. 2.3 IaaC
13. 5.1 README Factory
14. 5.2 README Template
15. 5.3 Quick Start

**Total: ~7.5 hours if all tasks completed in 30min each**
