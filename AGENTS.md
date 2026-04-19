# Factory Agents — Architecture

## 3 Harnesses × 3 Agents

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HARNESS 1: openclaw-deploy (Nanachi / CEO harness)                    │
│  Default Agent: CEO (Nanachi)                                          │
│  Workspace: nanachi-workspace                                          │
│  URL: https://nanachichan.rachkovan.com                               │
├─────────────────────────────────────────────────────────────────────────┤
│  HARNESS 2: hermes-agent-deploy (CTO / Nezuko harness)                 │
│  Default Agent: CTO (Nezuko/Hermes)                                   │
│  Workspace: nezuko-workspace                                            │
│  URL: Coolify (kg04ccokocsss4o0skssgg8k)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  HARNESS 3: factory-v2 (CMO / Rich harness)                           │
│  Default Agent: CMO (Rich)                                             │
│  Workspace: rich-workspace                                             │
│  URL: https://startup-factory.qed.quest + OpenClaw on :18791          │
└─────────────────────────────────────────────────────────────────┘
```

## 3 Agents (shared across all harnesses)

| Agent | Role | Workspace | SOUL |
|-------|------|-----------|------|
| **CEO (Nanachi)** | Strategy, coordination, deathmatch, AU ledger | nanachi-workspace | CEO personality |
| **CTO (Nezuko)** | Technical execution, deployment, architecture | nezuko-workspace | CTO personality |
| **CMO (Rich)** | Marketing, content, growth, social | rich-workspace | CMO personality |

Each harness loads all 3 agents. The DEFAULT agent differs per harness.

## Workspace Git Repos

- `nanachichan3/nanachi-workspace` — CEO workspace (this repo)
- `nanachichan3/nezuko-workspace` — CTO workspace
- `nanachichan3/rich-workspace` — CMO workspace

All 3 agents have access to all 3 workspaces. Agents sync their PRIMARY workspace on startup.

## Shared Infrastructure

- **Temporal:** `factory-temporal` (temporal:7233) — workflow orchestration
- **Factory API:** `factory-api:3000` — Node.js/TypeScript harness
- **PostgreSQL:** `pg-nanachi` (projects DB) — bot_messages, TODOs, AU ledger
- **Discord:** Shared bot token — all agents on same Discord server
- **Memory:** Per-agent Docker volumes + Git repos

## Communication

All inter-agent coordination via `bot_messages` table in `pg-nanachi`:
- `cto_msg` — CTO task channel
- `cmo_msg` — CMO task channel  
- `ceo_msg` — CEO task channel

Agents poll `bot_messages` every 30 seconds.

## Startup Lifecycle (8 stages)

```
Idea → Validation → MVP → Launch → Distribution → PMF → Support → Exit
```

All 3 agents execute against the active stage. Swarm intelligence (MiroFish) judges stage transitions.
