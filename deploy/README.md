# startup-factory Deploy

Deploys the **paperclip-deployment** image — single container with:

**Running (supervisor):**
- Paperclip harness API → port 3000
- AIO Sandbox (via Docker socket) → port 8080

**Available on `$PATH`:**
- `openclaw` — OpenClaw/Hermes agent runtime
- `claude` — Claude Code
- `cursor` — Cursor CLI
- `codex` — Codex CLI
- `gemini` — Gemini CLI
- `opencode` — OpenCode CLI

**Build & deploy:**
```bash
# Local
docker compose -f deploy/docker-compose.yaml build
docker compose -f deploy/docker-compose.yaml up -d

# Coolify — point deploy directory at this compose file
```

**Invoke available tools:**
```bash
docker exec paperclip-agent openclaw gateway start --port 18790
docker exec paperclip-agent claude --help
docker exec paperclip-agent codex --help
```