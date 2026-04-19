#!/bin/bash
set -e

# ============================================================
# Rick — CMO Agent (factory-v2 harness)
# ============================================================
# Loads CMO/Rich personality, syncs rich-workspace git repo

RICK_HOME="${RICK_HOME:-/home/node}"
CONFIG_DIR="$RICK_HOME/.openclaw/rick"
WORKSPACE_DIR="${WORKSPACE_DIR:-/data/workspace/startup-factory}"
GATEWAY_PORT="${RICK_GATEWAY_PORT:-18791}"
OPENCLAW_APP="/opt/openclaw/app"
NODE_BIN="/usr/local/bin/node"
WORKSPACE_GIT_URL="${WORKSPACE_GIT_URL:-https://github.com/nanachichan3/rich-workspace.git}"

mkdir -p "$CONFIG_DIR"
mkdir -p "$WORKSPACE_DIR"

echo "[rick] Starting CMO Agent (factory-v2 harness)..."
echo "[rick] Gateway port: $GATEWAY_PORT"
echo "[rick] Workspace git: $WORKSPACE_GIT_URL"

# ── Git sync rich-workspace ────────────────────────────────
if [ -n "$WORKSPACE_GIT_TOKEN" ]; then
    GIT_URL="https://${WORKSPACE_GIT_TOKEN}@github.com/nanachichan3/rich-workspace.git"
else
    GIT_URL="$WORKSPACE_GIT_URL"
fi

if [ -d "$WORKSPACE_DIR/.git" ]; then
    echo "[rick] Git pulling rich-workspace..."
    cd "$WORKSPACE_DIR" && git pull origin master --rebase 2>/dev/null || echo "[rick] Git sync skipped"
else
    echo "[rick] Cloning rich-workspace: $WORKSPACE_GIT_URL"
    git clone "$GIT_URL" "$WORKSPACE_DIR" 2>/dev/null || echo "[rick] Clone skipped"
fi

# ── Write agents.json (CMO agent) ─────────────────────────────────
cat > "$CONFIG_DIR/agents.json" << 'AGENTS'
[
  {
    "id": "cmo",
    "name": "CMO",
    "default": true,
    "workspace": "/data/workspace/startup-factory"
  },
  {
    "id": "ceo",
    "name": "CEO",
    "default": false,
    "workspace": "/data/workspace/startup-factory"
  },
  {
    "id": "cto",
    "name": "CTO",
    "default": false,
    "workspace": "/data/workspace/startup-factory"
  }
]
AGENTS

# ── Write .env ────────────────────────────────────────────────
cat > "$CONFIG_DIR/.env" << ENVEOF
RICK_GATEWAY_PORT=${RICK_GATEWAY_PORT:-18791}
DISCORD_ALLOWED_USERS=${DISCORD_ALLOWED_USERS:-588858125126336544,1484966987321835733}
DISCORD_REQUIRE_MENTION=${DISCORD_REQUIRE_MENTION:-false}
DISCORD_FREE_RESPONSE_CHANNELS=${DISCORD_FREE_RESPONSE_CHANNELS:-1489982401445888000,1489982424594251920,1484900474363842643}
TEMPORAL_ADDRESS=${TEMPORAL_ADDRESS:-temporal:7233}
TEMPORAL_NAMESPACE=${TEMPORAL_NAMESPACE:-default}
BOT_COORDINATION_DB_HOST=${BOT_COORDINATION_DB_HOST:-x0k4w8404wckwwcswg808gco}
BOT_COORDINATION_DB_PORT=${BOT_COORDINATION_DB_PORT:-5432}
BOT_COORDINATION_DB_USER=${BOT_COORDINATION_DB_USER:-postgres}
BOT_COORDINATION_DB_PASS=${BOT_COORDINATION_DB_PASS:-WFBGCo6cjCf7NbxVfkPSe5x0P41v3d27MowubhpPmfk9CgrfcMhBUvp8lyCfjobL}
BOT_COORDINATION_DB_NAME=${BOT_COORDINATION_DB_NAME:-projects}
PROJECTS_MCP_DATABASE_URL=${PROJECTS_MCP_DATABASE_URL:-postgres://postgres:WFBGCo6cjCf7NbxVfkPSe5x0P41v3d27MowubhpPmfk9CgrfcMhBUvp8lyCfjobL@x0k4w8404wckwwcswg808gco:5432/projects}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN:-}
ENVEOF

# ── Copy CMO SOUL if available ────────────────────────────
if [ -f "$WORKSPACE_DIR/SOUL.md" ]; then
    cp "$WORKSPACE_DIR/SOUL.md" "$RICK_HOME/SOUL.md"
    echo "[rick] CMO SOUL.md loaded from rich-workspace"
fi

echo "[rick] Config written. Starting OpenClaw gateway on port $GATEWAY_PORT..."

cd "$OPENCLAW_APP"
exec "$NODE_BIN" dist/index.js gateway \
    --bind lan \
    --port "$GATEWAY_PORT" \
    --workspace "$WORKSPACE_DIR" \
    --config-dir "$CONFIG_DIR"
