import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");
const projectUuid = "k8kgkwocskk4k084k0s0ko48";
const environmentName = "production";
const serverUuid = "bowowgww8cw08kokogk88oss";
const appUuid = "jock4w84c48s4o44gs0scso4";

// Database config — projects DB already exists on pg-nanachi
const dbHost = "x0k4w8404wckwwcswg808gco";
const dbPort = 5432;
const dbName = "projects";
const dbUser = "postgres";

// ============================================================================
// HELPERS
// ============================================================================

function coolifyHeaders(): string {
  return `-H "Authorization: Bearer ${coolifyApiKey}" -H "Content-Type: application/json"`;
}

async function curl(method: string, path: string, body?: string): Promise<any> {
  const url = `${coolifyApiUrl}${path}`;
  const bodyArg = body ? `-d '${body}'` : '';
  const cmd = `curl -s -X ${method} "${url}" ${coolifyHeaders()} ${bodyArg}`;
  const result = await command.local.run({ command: cmd });
  try {
    return JSON.parse(result.stdout);
  } catch {
    return result.stdout;
  }
}

// ============================================================================
// 1. Run Prisma Migration on projects DB
// ============================================================================

const dbMigration = new command.local.Command("db-migration", {
  create: pulumi.interpolate`
    echo "Running Prisma migration on projects DB..."
    cd /tmp/startup-factory/packages/harness && \
    DATABASE_URL="postgresql://postgres:${config.requireSecret("dbPassword")}@${dbHost}:${dbPort}/${dbName}" \
    npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 || \
    echo "Migration may already be applied or DB not reachable from this host"
  `,
  delete: `echo "No-op on delete — migrations are idempotent"`,
});

// ============================================================================
// 2. Deploy Mem0 (Persistent Memory)
// ============================================================================

const mem0Service = new command.local.Command("mem0-service", {
  create: `curl -s -X POST "${coolifyApiUrl}/services" ${coolifyHeaders()} -d '{
    "name": "mem0",
    "project_uuid": "${projectUuid}",
    "environment_name": "${environmentName}",
    "server_uuid": "${serverUuid}",
    "docker_compose_raw": ${JSON.stringify(`version: '3.8'
services:
  mem0:
    image: mem0ai/mem0:latest
    ports:
      - "5000:5000"
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=sqlite:///data/mem0.db
    volumes:
      - mem0_data:/data
    networks:
      - coolify
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - coolify
volumes:
  mem0_data:
networks:
  coolify:
    external: true`)}
  }'`,
  delete: `curl -s -X DELETE "${coolifyApiUrl}/services/mem0" ${coolifyHeaders()}`,
}, { dependsOn: [] });

// ============================================================================
// 3. Update Startup Factory Harness (pull latest image, update env)
// ============================================================================

const harnessUpdate = new command.local.Command("harness-update", {
  create: `curl -s -X PUT "${coolifyApiUrl}/applications/${appUuid}" ${coolifyHeaders()} -d '{
    "name": "startup-factory",
    "health_check_enabled": true,
    "health_check_path": "/health",
    "ports_exposes": "3010,5001",
    "docker_compose_raw": ${JSON.stringify(`version: '3.8'
services:
  startup-factory:
    image: ghcr.io/nanachichan3/startup-factory:latest
    ports:
      - "3010:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@${dbHost}:${dbPort}/${dbName}
      - TEMPORAL_ADDRESS=\${TEMPORAL_ADDRESS}
      - TEMPORAL_NAMESPACE=\${TEMPORAL_NAMESPACE}
      - TEMPORAL_API_KEY=\${TEMPORAL_API_KEY}
      - OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.startup-factory.rule=Host(\`startup-factory.qed.quest\`)"
      - "traefik.http.services.startup-factory.loadbalancer.server.port=3000"
    networks:
      - coolify
networks:
  coolify:
    external: true`)}
  }'`,
}, { dependsOn: [dbMigration] });

// ============================================================================
// 4. Trigger redeploy
// ============================================================================

const harnessDeploy = new command.local.Command("harness-deploy", {
  create: `curl -s -X POST "${coolifyApiUrl}/deployments" ${coolifyHeaders()} -d '{
    "application_id": "${appUuid}",
    "is_force": true
  }'`,
  delete: `echo "No-op on delete"`,
}, { dependsOn: [harnessUpdate] });

// ============================================================================
// EXPORTS
// ============================================================================

export const harnessUrl = "http://startup-factory.qed.quest";
export const mem0Url = "http://mem0.qed.quest";
export const dbHost = dbHost;
export const dbName = dbName;
