-- Migration: 20260101000000_init
-- Startup Factory full schema
-- Compatible with NocoDB — enum colors stored as SQL comments

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE "LifecycleStage" AS ENUM (
  'Ideation', 'Validation', 'Prototype', 'MVP', 'Growth', 'Scale', 'Optimize', 'Exit'
);

CREATE TYPE "AgentStatus" AS ENUM ('active', 'inactive');

CREATE TYPE "AssignmentStatus" AS ENUM (
  'pending', 'in_progress', 'completed', 'blocked'
);

CREATE TYPE "WorkflowStatus" AS ENUM (
  'running', 'completed', 'failed', 'cancelled'
);

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE "startups" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "founderBrief" TEXT NOT NULL DEFAULT '',
  "stage" "LifecycleStage" NOT NULL DEFAULT 'Ideation',
  "currentWorkflowId" TEXT,
  "lastExecutedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "startups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "artifacts" (
  "id" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "agentRole" TEXT,
  "iteration" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lifecycle_events" (
  "id" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "fromStage" "LifecycleStage",
  "toStage" "LifecycleStage" NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agents" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "status" "AgentStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_assignments" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "stage" "LifecycleStage" NOT NULL,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "agent_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_messages" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "workflowId" TEXT,
  "runId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_runs" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'running',
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE UNIQUE INDEX "agents_name_key" ON "agents"("name");
CREATE UNIQUE INDEX "agent_assignments_agentId_startupId_stage_key" ON "agent_assignments"("agentId", "startupId", "stage");
CREATE UNIQUE INDEX "workflow_runs_workflowId_key" ON "workflow_runs"("workflowId");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_startupId_fkey"
  FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_startupId_fkey"
  FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON UPDATE CASCADE;

ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_startupId_fkey"
  FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "agents"("id") ON UPDATE CASCADE;

ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "agents"("id") ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_startupId_fkey"
  FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- SEED: Initial factory agents
-- ============================================================================

INSERT INTO "agents" ("id", "name", "displayName", "role", "systemPrompt", "status", "createdAt", "updatedAt")
VALUES
  (
    'agent-ceo',
    'ceo',
    'CEO / Factory Coordinator',
    'coordinator',
    'You are the CEO of the Startup Factory. You coordinate the expert loop and make strategic decisions. You think in systems and optimize for outcomes. You delegate with crystal clear briefs and evaluate outputs before they ship.',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'agent-cto',
    'cto',
    'Chief Technology Officer',
    'technologist',
    'You are the CTO of the Startup Factory. You create technical architectures, MVP specifications, and development roadmaps. You think in stacks, APIs, and data models. You validate technical feasibility.',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'agent-cmo',
    'cmo',
    'Chief Marketing Officer',
    'marketer',
    'You are the CMO of the Startup Factory. You create GTM strategies, content plans, and market positioning. You think in channels, acquisition, and growth. You validate market demand.',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name") DO NOTHING;
