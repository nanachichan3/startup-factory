import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

// Configuration
const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");
const projectUuid = "k8kgkwocskk4k084k0s0ko48";
const environmentName = "production";
const serverUuid = "bowowgww8cw08kokogk88oss";

// Headers for Coolify API
const headers = `{"Authorization": "Bearer ${coolifyApiKey}", "Content-Type": "application/json"}`;

// Helper function to call Coolify API
async function coolifyApi(method: string, path: string, body?: string): Promise<any> {
    const url = `${coolifyApiUrl}${path}`;
    const cmd = body 
        ? `curl -s -X ${method} "${url}" -H 'Authorization: Bearer ${coolifyApiKey}' -H 'Content-Type: application/json' -d '${body}'`
        : `curl -s -X ${method} "${url}" -H 'Authorization: Bearer ${coolifyApiKey}'`;
    
    const result = await command.local.run({ command: cmd });
    return JSON.parse(result.stdout);
}

// 1. Deploy PostgreSQL for Temporal
const temporalDb = new command.local.Command("temporal-db", {
    create: `curl -s -X POST "${coolifyApiUrl}/databases" \
        -H 'Authorization: Bearer ${coolifyApiKey}' \
        -H 'Content-Type: application/json' \
        -d '{
            "type": "postgresql",
            "name": "temporal-db",
            "project_uuid": "${projectUuid}",
            "environment_name": "${environmentName}",
            "postgres_db": "temporal",
            "postgres_user": "temporal",
            "postgres_password": "temporal",
            "is_public": false
        }'`,
    delete: `curl -s -X DELETE "${coolifyApiUrl}/databases/temporal-db" -H 'Authorization: Bearer ${coolifyApiKey}'`,
});

// 2. Deploy Mem0 (Persistent Memory)
const mem0Service = new command.local.Command("mem0-service", {
    create: `curl -s -X POST "${coolifyApiUrl}/services" \
        -H 'Authorization: Bearer ${coolifyApiKey}' \
        -H 'Content-Type: application/json' \
        -d '{
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
    delete: `curl -s -X DELETE "${coolifyApiUrl}/services/mem0" -H 'Authorization: Bearer ${coolifyApiKey}'`,
}, { dependsOn: [temporalDb] });

// 3. Deploy Temporal Service
const temporalService = new command.local.Command("temporal-service", {
    create: `curl -s -X POST "${coolifyApiUrl}/services" \
        -H 'Authorization: Bearer ${coolifyApiKey}' \
        -H 'Content-Type: application/json' \
        -d '{
            "name": "temporal",
            "project_uuid": "${projectUuid}",
            "environment_name": "${environmentName}",
            "server_uuid": "${serverUuid}",
            "docker_compose_raw": ${JSON.stringify(`version: '3.8'
services:
  temporal:
    image: temporalio/auto-setup:1.22.0
    ports:
      - "7233:7233"
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=temporal-db
    networks:
      - coolify

volumes:
  temporal_data:

networks:
  coolify:
    external: true`)}
        }'`,
    delete: `curl -s -X DELETE "${coolifyApiUrl}/services/temporal" -H 'Authorization: Bearer ${coolifyApiKey}'`,
}, { dependsOn: [temporalDb] });

// 4. Deploy Startup Factory Harness
const harnessService = new command.local.Command("harness-service", {
    create: `curl -s -X POST "${coolifyApiUrl}/applications" \
        -H 'Authorization: Bearer ${coolifyApiKey}' \
        -H 'Content-Type: application/json' \
        -d '{
            "name": "startup-factory",
            "project_uuid": "${projectUuid}",
            "environment_name": "${environmentName}",
            "server_uuid": "${serverUuid}",
            "git_repository": "https://github.com/nanachichan3/startup-factory",
            "git_branch": "main",
            "build_pack": "dockercompose",
            "ports_exposes": "3000",
            "is_static": false,
            "docker_compose_raw": ${JSON.stringify(`version: '3.8'
services:
  startup-factory:
    build: ..
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - TEMPORAL_ADDRESS=temporal:7233
      - DATABASE_URL=postgresql://temporal:temporal@temporal-db:5432/temporal
      - MEM0_URL=http://mem0:5000
    networks:
      - coolify

networks:
  coolify:
    external: true`)}
        }'`,
    delete: `curl -s -X DELETE "${coolifyApiUrl}/applications/startup-factory" -H 'Authorization: Bearer ${coolifyApiKey}'`,
}, { dependsOn: [temporalService, mem0Service] });

// Export deployment URLs
export const temporalUrl = "https://temporal.qed.quest";
export const mem0Url = "https://mem0.qed.quest";
export const harnessUrl = "https://startup-factory.qed.quest";
