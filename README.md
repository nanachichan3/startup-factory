# Startup Factory

**AI-driven startup creation engine** — a systematized framework for taking ideas from inception to exit using Temporal workflows, Langgraph-powered expert loops, and A2A agent communication.

## 🚀 Launch Criteria

This repository contains all components needed for the Startup Factory launch:

- ✅ **Temporal.io Integration** — Workflow orchestration with PostgreSQL persistence
- ✅ **Langgraph Integration** — Universal Expert Loop as a state graph
- ✅ **A2A Protocol** — Agent-to-agent messaging handler
- ✅ **Docker Ready** — Full docker-compose with Temporal, PostgreSQL, Redis
- ✅ **Deployment Ready** — Coolify-compatible configuration

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Startup Factory                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     CEO      │  │     CTO      │  │     CMO      │      │
│  │  (Nanachi)   │  │   (You)      │  │  (Marketing) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│              ┌────────────▼────────────┐                    │
│              │     A2A Protocol        │                    │
│              │   (Message Handler)    │                    │
│              └────────────┬────────────┘                    │
│                           │                                 │
│    ┌──────────────────────┼──────────────────────┐         │
│    │                      │                      │         │
│    ▼                      ▼                      ▼         │
│ ┌────────┐          ┌────────────┐          ┌────────┐     │
│ │Temporal│◄────────▶│  Langgraph │◄────────►│ PostgreSQL│   │
│ │Workflow│          │ Expert Loop│         │   DB    │     │
│ └────────┘          └────────────┘          └────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
startup-factory/
├── packages/
│   └── harness/              # Agent execution harness
│       └── src/
│           ├── workflows/   # Temporal workflows & activities
│           ├── graph/       # Langgraph expert loop
│           ├── protocol/    # A2A message handler
│           └── llm/        # LLM client configuration
├── src/
│   ├── lifecycle/          # 8-stage startup lifecycle schema
│   └── uel/                # Universal Expert Loop core
├── infra/                   # Infrastructure definitions
├── docker-compose.yml       # Full stack deployment
└── README.md
```

## 🔄 Universal Expert Loop (UEL)

The UEL cycles output through specialized AI personas using Langgraph:

```
[User Input] → Listen → Decide → Delegate → Validate → Persist → Reflect
                                                           ↓
                              (repeat until complete) ←───┘
```

### Graph Nodes

| Node | Purpose |
|------|---------|
| **Listen** | Receive and parse input |
| **Decide** | Route to appropriate specialist |
| **Delegate** | Invoke specialist agent |
| **Validate** | Check output quality |
| **Persist** | Save validated artifact |
| **Reflect** | Review progress, decide continue/finish |

## 🛠 Technical Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript 5
- **Workflow**: Temporal.io 1.22
- **AI Graph**: LangChain/Langgraph
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Deployment**: Docker + Coolify

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/nanachichan3/startup-factory.git
cd startup-factory

# Install dependencies
npm install

# Start infrastructure
docker-compose up -d

# Run the harness
npm run dev
```

### Connect to Temporal UI

Open `http://localhost:8080` to view the Temporal Web UI.

## 📋 Launch Checklist

- [x] Temporal.io integration with workflows
- [x] Langgraph expert loop implementation
- [x] A2A protocol message handler
- [x] Docker compose with PostgreSQL
- [x] Coolify deployment ready
- [x] README and documentation
- [ ] **Deployment to Coolify** (manual step required)
- [ ] **Temporal UI verified accessible**

## 📚 Documentation

- [Quick Start](./docs/quick-start.md)
- [API Reference](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

## 🔗 Related Repositories

- [startup-template](https://github.com/nanachichan3/startup-template) — Production template for new startups

## License

MIT © Yev Rachkovan
