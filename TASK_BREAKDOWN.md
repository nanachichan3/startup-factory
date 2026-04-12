# Startup Factory — Task Breakdown (2026-04-12)

All tasks ≤30 min. Agents pick up unassigned tasks every 30 mins.

## PHASE 0: Task System Infrastructure ⚡

### Task 0.1: Add TODO table to Prisma schema
**Timebox:** 15 min
```
Add `model Task` to schema.prisma:
- id (text, pk)
- title (text)
- description (text)
- priority (low/medium/high/critical)
- status (todo/in_progress/done/blocked)
- assignee (text, nullable)
- phase (phase0/phase1/phase2/phase3/phase4)
- estimate_minutes (int)
- created_at, updated_at
```
**Who:** Spawn sub-agent NOW

### Task 0.2: Seed all tasks into DB
**Timebox:** 15 min
```
Seed all tasks from this file into the Task table
```
**Who:** After 0.1, auto-triggered

---

## PHASE 1: Fix Broken Infrastructure 🔧

### Task 1.1: Deploy and connect Mem0
**Timebox:** 30 min
**Priority:** critical
```
1. Read infra/mem0/docker-compose.yaml
2. Deploy Mem0 to Coolify (same network as Temporal)
3. Add MEM0_API_KEY / MEM0_HOST env vars to factory harness
4. Wire Mem0 into agent memory system
5. Verify: API call to Mem0 returns success
6. Commit + push
```
**Verification:** `curl Mem0健康check` returns 200

### Task 1.2: Wire Temporal workflows to real execution
**Timebox:** 30 min
**Priority:** critical
```
1. Read src/workflows/factory-workflow.ts + expert-loop-workflow.ts
2. Check why Temporal shows "disconnected" in /health
3. Fix TEMPORAL_ADDRESS (should be temporal:7233 in dockercompose)
4. Verify Temporal namespace is accessible
5. Test: POST /api/startups/:id/execute triggers real Temporal workflow
6. Commit + push
```
**Verification:** POST /api/startups → execute → Temporal workflow running

### Task 1.3: Deploy MiroFish for Swarm Intelligence
**Timebox:** 30 min
**Priority:** high
```
1. Read infra/pulumi/mirofish.ts (existing Pulumi code)
2. Read MiroFish docs at mirofish.dev or GH
3. Deploy MiroFish to Coolify
4. Wire swarm endpoint to stage-gate evaluation
5. Test: Trigger swarm evaluation for a startup stage
6. Commit + push
```
**Verification:** MiroFish responds to API calls

### Task 1.4: Add Prometheus + Grafana observability
**Timebox:** 30 min
**Priority:** medium
```
1. Add prometheus client to factory harness (prom-client)
2. Expose /metrics endpoint
3. Deploy prometheus + grafana via dockercompose on Coolify
4. Create dashboard JSON for startup factory metrics
5. Commit + push
```
**Verification:** GET /metrics returns prometheus format

---

## PHASE 2: Self-Steering Agent System 🤖

### Task 2.1: Configure 30-min heartbeat scheduler
**Timebox:** 20 min
**Priority:** critical
```
1. Add cron job: every 30 mins, isolated session
2. Cron triggers CEO agent to check for unassigned tasks
3. CEO spawns sub-agents for task execution
4. Auto-update task status in DB
```
**Verification:** Cron fires every 30 mins

### Task 2.2: Wire Expert Loops to Temporal (CEO loop)
**Timebox:** 30 min
**Priority:** critical
```
1. Read src/graph/expert-loop-graph.ts
2. Make LangGraph nodes execute as Temporal activities
3. Wire Listen→Decide→Delegate→Validate→Persist→Reflect to Temporal
4. Test: Submit startup idea → verify all 6 nodes execute
5. Commit + push
```
**Verification:** Startup goes through all 6 nodes in Temporal UI

### Task 2.3: Wire CTO Task Execution Pipeline
**Timebox:** 30 min
**Priority:** high
```
1. Wire CTO to receive tasks from CEO via A2A
2. CTO spawns sub-agents for tech tasks
3. CTO reports back to CEO on completion
4. Test: CEO assigns "build MVP spec" → CTO delivers spec
5. Commit + push
```
**Verification:** CTO completes assigned task without manual intervention

### Task 2.4: Wire CMO Content Engine Loop
**Timebox:** 30 min
**Priority:** high
```
1. Wire CMO to receive tasks from CEO via A2A
2. CMO executes Content Engine workflow (daily growth loop)
3. Test: Assign "create 1-week content plan" → CMO delivers plan
4. Commit + push
```
**Verification:** CMO produces content plan document

### Task 2.5: Add task selection + reporting logic to CEO
**Timebox:** 30 min
**Priority:** critical
```
1. CEO queries DB for unassigned tasks (priority=high/critical first)
2. CEO assigns to CTO/CMO based on task type
3. CEO updates task status on completion
4. CEO reports to Yev on major milestones
5. Commit + push
```
**Verification:** CEO picks up tasks without prompting

---

## PHASE 3: Integrations 🔌

### Task 3.1: Integrate Postbridge (social scheduling)
**Timebox:** 30 min
**Priority:** medium
```
1. Get Postbridge API credentials
2. Add Postbridge skill to CMO agent
3. Wire to social media scheduling workflow
4. Test: Schedule a test post via agent
5. Commit + push
```
**Verification:** Post appears in Postbridge queue

### Task 3.2: Integrate Apify scraping
**Timebox:** 30 min
**Priority:** medium
```
1. Deploy Apify actor to Coolify
2. Add Apify skill to CTO agent
3. Wire to competitor research workflow (Idea stage)
4. Test: Agent scrapes 10 competitors for a startup
5. Commit + push
```
**Verification:** Competitor data returned from Apify

### Task 3.3: Integrate Stripe (financial)
**Timebox:** 20 min
**Priority:** low
```
1. Add Stripe skill to CEO agent
2. Wire to PMF/Exit stage financial tracking
3. Commit + push
```
**Verification:** Stripe balance retrievable via agent

### Task 3.4: Integrate Docuseal (legal)
**Timebox:** 20 min
**Priority:** low
```
1. Add Docuseal skill to CEO agent
2. Wire to contract generation for Exit stage
3. Commit + push
```
**Verification:** Agent generates a test contract

---

## PHASE 4: End-to-End Verification 🧪

### Task 4.1: Run E2E test — Full startup lifecycle
**Timebox:** 30 min
**Priority:** critical
```
1. Create a test startup via API: "AI-powered code review tool"
2. Trigger workflow execution
3. Verify: Tech Architecture doc created (CTO)
4. Verify: GTM strategy created (CMO)
5. Verify: Stage advanced Idea → Validation
6. Log results to DB
```
**Verification:** All 4 assertions pass

### Task 4.2: E2E test — Swarm evaluation
**Timebox:** 30 min
**Priority:** critical
```
1. Take startup in Validation stage
2. Trigger swarm intelligence evaluation
3. Verify: MiroFish returns evaluation score
4. Verify: Stage advances if score >= threshold
5. Log evaluation to DB
```
**Verification:** MiroFish returns score + stage gate passes/fails

### Task 4.3: E2E test — Multi-agent coordination
**Timebox:** 30 min
**Priority:** high
```
1. CEO assigns 3 tasks simultaneously (CTO × 2, CMO × 1)
2. Verify all 3 execute in parallel
3. Verify all 3 report back to CEO
4. Verify artifacts stored in DB
```
**Verification:** All 3 tasks complete within 10 mins

### Task 4.4: E2E test — Fail tolerance
**Timebox:** 30 min
**Priority:** high
```
1. Kill a running Temporal workflow mid-execution
2. Verify: Workflow restarts and picks up from last checkpoint
3. Verify: No data loss
```
**Verification:** Workflow recovers from simulated failure

### Task 4.5: Build verification dashboard
**Timebox:** 30 min
**Priority:** medium
```
1. Add /api/dashboard/tests endpoint
2. Show: Pass/fail history of E2E tests
3. Show: Agent execution metrics
4. Show: Startup stage progression timeline
5. Commit + push
```
**Verification:** Dashboard shows test results

---

## PHASE 5: OpenClaw Migration (Long-term) 🚀

### Task 5.1: Audit OpenClaw dependencies
**Timebox:** 30 min
**Priority:** medium
```
1. List all OpenClaw-specific skills/tools used by agents
2. Map each to equivalent standalone tool
3. Document migration path for each
4. Commit findings to docs/migration.md
```
**Verification:** doc created with full mapping

### Task 5.2: Build standalone CEO agent (no OpenClaw)
**Timebox:** 30 min
**Priority:** high
```
1. Extract CEO logic from SOUL.md + workspace
2. Build standalone Node.js agent with Temporal + LangGraph
3. Test: CEO agent receives task → executes → reports
4. Commit to packages/ceo-agent/
```
**Verification:** CEO runs without OpenClaw

### Task 5.3: Build standalone CTO agent (no OpenClaw)
**Timebox:** 30 min
**Priority:** high
```
1. Extract CTO logic from workspace
2. Build standalone Node.js agent with Temporal + LangGraph
3. Test: Receives task from CEO → executes → reports
4. Commit to packages/cto-agent/
```
**Verification:** CTO runs without OpenClaw

### Task 5.4: Build standalone CMO agent (no OpenClaw)
**Timebox:** 30 min
**Priority:** high
```
1. Extract CMO logic from workspace
2. Build standalone Node.js agent with Temporal + LangGraph
3. Test: Receives task from CEO → executes → reports
4. Commit to packages/cmo-agent/
```
**Verification:** CMO runs without OpenClaw

### Task 5.5: Full OpenClaw cutover
**Timebox:** 30 min
**Priority:** medium
```
1. Point all agent references to new standalone agents
2. Remove OpenClaw agent configs
3. Update factory dashboard to show new agents
4. Commit + push
5. Verify all agents respond
```
**Verification:** Factory runs 100% without OpenClaw

---

## Task Execution Rules
1. **Max 30 min per task** — flag and escalate if not done
2. **One task at a time per agent** — no parallel on same agent
3. **Verify before marking done** — run test assertion
4. **Commit after every task** — git add + commit + push
5. **Update task status in DB** — todo → in_progress → done
