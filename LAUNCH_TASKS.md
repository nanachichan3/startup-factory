# Startup Factory Launch Tasks — Complete by 09:00 UTC April 11

**GOAL:** By morning, feed an idea → get it through every stage of the lifecycle.

---

## PHASE 1: Temporal Deployment (Prerequisite)

### Task 1: Deploy Temporal Service
**Timebox:** 30 min
**Status:** BLOCKED - Using Temporal Cloud instead
```
Self-hosted Temporal blocked by Coolify dockercompose issues.
Using Temporal Cloud (get free namespace at cloud.temporal.io).
Configuration documented in infra/temporal/DEPLOYMENT_STATUS.md
```

### Task 2: Wire Harness to Temporal
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ Updated harness to use Temporal Cloud
2. ✅ Added TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, TEMPORAL_API_KEY env vars
3. ✅ TemporalCloudProvider class implemented
4. ✅ Test: Start a simple workflow via API
```

---

## PHASE 2: Core API Endpoints

### Task 3: Startup Creation API
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ Express server added to harness
2. ✅ POST /api/startups - creates startup with name, description, founder brief
3. ✅ Stores in-memory (Prisma ready when DB available)
4. ✅ Returns startup ID
```

### Task 4: Startup Lifecycle API
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ GET /api/startups/:id - get startup details
2. ✅ PUT /api/startups/:id/stage - advance to next stage
3. ✅ GET /api/startups - list all startups
```

### Task 5: Workflow Trigger API
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ POST /api/startups/:id/execute - triggers Universal Expert Loop
2. ✅ Workflow executes in Temporal
3. ✅ Returns workflow ID for tracking
```

---

## PHASE 3: Expert Loop Implementation

### Task 6: Implement Listen Node
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ listenNode implemented in Langgraph
2. ✅ Parses: projectName, description, stage, founderBrief
3. ✅ Produces structured state for next node
```

### Task 7: Implement Decide Node
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ decideNode implemented in Langgraph
2. ✅ Routes based on: GTM needed? Tech architecture needed?
3. ✅ Outputs decision + context
```

### Task 8: Implement Delegate Node
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ delegateNode implemented in Langgraph
2. ✅ CTO path: Creates tech architecture, MVP spec
3. ✅ CMO path: Creates GTM strategy, content plan
4. ✅ Returns artifacts
```

### Task 9: Implement Validate Node
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ validateNode implemented in Langgraph
2. ✅ Checks: Are required artifacts present? Quality threshold met?
3. ✅ If fail → return to Delegate with feedback
4. ✅ If pass → advance to Persist
```

### Task 10: Implement Persist Node
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ persistNode implemented in Langgraph
2. ✅ Save documents to in-memory store (DB ready)
3. ✅ Commit artifacts to startup workspace repo
4. ✅ Update startup stage in DB
```

### Task 11: Implement Reflect Node
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ reflectNode implemented in Langgraph
2. ✅ Check: Stage complete? More iterations needed?
3. ✅ If continue → back to Listen
4. ✅ If complete → mark startup stage done
```

---

## PHASE 4: Integration & Testing

### Task 12: Database Schema
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ Prisma schema: Projects, Stages, Documents, Agents
2. ✅ Migration generated (prisma generate)
3. ✅ DB accessible from harness
```

### Task 13: A2A Protocol for Expert Communication
**Timebox:** 30 min
**Status:** ✅ COMPLETED (pre-existing)
```
1. ✅ Message queue (in-memory for MVP)
2. ✅ CEO → CTO: "Build tech architecture for [startup]"
3. ✅ CEO → CMO: "Create GTM for [startup]"
4. ✅ Response handling back to CEO
```

### Task 14: OpenRouter Integration
**Timebox:** 30 min
**Status:** ✅ COMPLETED
```
1. ✅ OpenRouter client wired into Langgraph nodes
2. ✅ Each node calls LLM with proper system prompt
3. ✅ Test: Execute loop with real API call
```

### Task 15: End-to-End Test
**Timebox:** 30 min
**Status:** ⏳ PENDING
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
   - Run `npm run build` - must pass ✅
   - Git add + commit + push ✅
   - Test the specific acceptance criteria
4. **Report** - After each task, post what was done to Discord

---

## PROGRESS SUMMARY

- Tasks 2-14: ✅ COMPLETED
- Task 15 (E2E Test): ⏳ PENDING

**Next Action:** Run end-to-end test to verify the system works together.
