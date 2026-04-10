# Startup Factory Launch Tasks — Complete by 09:00 UTC April 11

**GOAL:** By morning, feed an idea → get it through every stage of the lifecycle.

---

## PHASE 1: Temporal Deployment (Prerequisite)

### Task 1: Deploy Temporal Service
**Timebox:** 30 min
**Acceptance:** Temporal Web UI accessible at a public URL
```
1. Deploy Temporal via Coolify one-click service or docker-compose
2. Configure PostgreSQL for Temporal persistence
3. Verify Temporal Web UI is accessible
4. Commit deployment config to `infra/` in startup-factory
```

### Task 2: Wire Harness to Temporal
**Timebox:** 30 min
**Acceptance:** Harness can connect to Temporal and start workflows
```
1. Update harness to connect to deployed Temporal
2. Add TEMPORAL_ADDRESS environment variable to Coolify deployment
3. Test: Start a simple workflow via API
4. Verify workflow executes in Temporal dashboard
```

---

## PHASE 2: Core API Endpoints

### Task 3: Startup Creation API
**Timebox:** 30 min
**Acceptance:** POST /api/startups creates a new startup in the system
```
1. Add Express/Fastify server to harness
2. POST /api/startups - creates startup with name, description, founder brief
3. Store in PostgreSQL via Prisma
4. Returns startup ID
```

### Task 4: Startup Lifecycle API
**Timebox:** 30 min
**Acceptance:** GET /api/startups/:id returns startup with current stage
```
1. GET /api/startups/:id - get startup details
2. PUT /api/startups/:id/stage - advance to next stage
3. GET /api/startups - list all startups
```

### Task 5: Workflow Trigger API
**Timebox:** 30 min
**Acceptance:** POST /api/startups/:id/execute triggers the expert loop
```
1. POST /api/startups/:id/execute - triggers Universal Expert Loop
2. Workflow executes in Temporal
3. Returns workflow ID for tracking
```

---

## PHASE 3: Expert Loop Implementation

### Task 6: Implement Listen Node
**Timebox:** 30 min
**Acceptance:** Listens for input and parses startup brief
```
1. Implement listenNode in Langgraph
2. Parses: projectName, description, stage, founderBrief
3. Produces structured state for next node
```

### Task 7: Implement Decide Node
**Timebox:** 30 min
**Acceptance:** Decides which expert (CTO/CMO) to delegate to
```
1. Implement decideNode in Langgraph
2. Routes based on: GTM needed? Tech architecture needed? Both?
3. Outputs decision + context
```

### Task 8: Implement Delegate Node
**Timebox:** 30 min
**Acceptance:** Invokes appropriate sub-agent based on decision
```
1. Implement delegateNode in Langgraph
2. CTO path: Creates tech architecture, MVP spec
3. CMO path: Creates GTM strategy, content plan
4. Returns artifacts
```

### Task 9: Implement Validate Node
**Timebox:** 30 min
**Acceptance:** Validates output quality from Delegate
```
1. Implement validateNode in Langgraph
2. Checks: Are required artifacts present? Quality threshold met?
3. If fail → return to Delegate with feedback
4. If pass → advance to Persist
```

### Task 10: Implement Persist Node
**Timebox:** 30 min
**Acceptance:** Saves validated artifacts to DB and repo
```
1. Implement persistNode in Langgraph
2. Save documents to DB (Prisma)
3. Commit artifacts to startup workspace repo
4. Update startup stage in DB
```

### Task 11: Implement Reflect Node
**Timebox:** 30 min
**Acceptance:** Reviews progress, decides continue or finish
```
1. Implement reflectNode in Langgraph
2. Check: Stage complete? More iterations needed?
3. If continue → back to Listen
4. If complete → mark startup stage done
```

---

## PHASE 4: Integration & Testing

### Task 12: Database Schema
**Timebox:** 30 min
**Acceptance:** Prisma schema matches startup lifecycle needs
```
1. Define Prisma schema: Projects, Stages, Documents, Agents
2. Run migration
3. Verify DB is accessible from harness
```

### Task 13: A2A Protocol for Expert Communication
**Timebox:** 30 min
**Acceptance:** CEO can send tasks to CTO/CMO via A2A
```
1. Implement message queue (Redis or in-memory for MVP)
2. CEO → CTO: "Build tech architecture for [startup]"
3. CEO → CMO: "Create GTM for [startup]"
4. Response handling back to CEO
```

### Task 14: OpenRouter Integration
**Timebox:** 30 min
**Acceptance:** Expert loop uses LLMs via OpenRouter
```
1. Wire OpenRouter client into Langgraph nodes
2. Each node calls LLM with proper system prompt
3. Test: Execute loop with real API call
```

### Task 15: End-to-End Test
**Timebox:** 30 min
**Acceptance:** Feed idea → get MVP artifacts
```
1. POST /api/startups with idea: "AI-powered code review for startups"
2. Trigger workflow execution
3. Verify: Tech Architecture doc created, GTM strategy created
4. Verify: Stage advanced from Idea → MVP
```

---

## TASK EXECUTION RULES

1. **One task at a time** - Complete and verify before moving to next
2. **30 min timebox** - If not done in 30 min, flag and move on
3. **Verification** - After each task:
   - Run `npm run build` - must pass
   - Git add + commit + push
   - Test the specific acceptance criteria
4. **Report** - After each task, post what was done to Discord

---

## PRIORITY ORDER

1. Task 1: Deploy Temporal (BLOCKER - nothing works without this)
2. Task 12: Database Schema (BLOCKER - need to store startups)
3. Task 2: Wire Harness to Temporal
4. Task 3: Startup Creation API
5. Task 4: Startup Lifecycle API
6. Task 5: Workflow Trigger API
7. Task 6: Listen Node
8. Task 7: Decide Node
9. Task 8: Delegate Node
10. Task 9: Validate Node
11. Task 10: Persist Node
12. Task 11: Reflect Node
13. Task 13: A2A Protocol
14. Task 14: OpenRouter Integration
15. Task 15: End-to-End Test

**Total: ~7.5 hours if all tasks hit 30min each**
