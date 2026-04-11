import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

// Configuration
const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");

// Application details
const applicationUuid = "jock4w84c48s4o44gs0scso4";
const projectUuid = "k8kgkwocskk4o44gs0scso4";
const environmentName = "production";

// Environment variables for the startup-factory harness
const envVars = [
  { key: "DATABASE_URL", value: "postgresql://postgres:${COOLIFY_DATABASE_PASSWORD}@x0k4w8404wckwwcswg808gco:5432/projects", isBuildVariable: false },
  { key: "TEMPORAL_ADDRESS", value: "", isBuildVariable: false },
  { key: "TEMPORAL_NAMESPACE", value: "", isBuildVariable: false },
  { key: "TEMPORAL_API_KEY", value: "", isBuildVariable: false },
  { key: "OPENROUTER_API_KEY", value: "${OPENROUTER_API_KEY}", isBuildVariable: false },
  { key: "PORT", value: "3000", isBuildVariable: false },
  { key: "NODE_ENV", value: "production", isBuildVariable: false },
];

// Docker compose configuration for the startup-factory harness
const dockerComposeRaw = Buffer.from(`
version: '3.8'
services:
  startup-factory:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
    environment:
      - PORT=3000
      - NODE_ENV=production
      - 'DATABASE_URL=\${DATABASE_URL}'
      - 'TEMPORAL_ADDRESS=\${TEMPORAL_ADDRESS}'
      - 'TEMPORAL_NAMESPACE=\${TEMPORAL_NAMESPACE}'
      - 'TEMPORAL_API_KEY=\${TEMPORAL_API_KEY}'
      - 'OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.startup-factory.rule=Host(\`startup-factory.qed.quest\`)"
      - "traefik.http.services.startup-factory.loadbalancer.server.port=3000"
      - "traefik.http.routers.startup-factory.tls=true"
      - "traefik.http.routers.startup-factory.tls.certresolver=letsencrypt"
    networks:
      - coolify

networks:
  coolify:
    external: true
`).toString('base64');

// 1. Update application with dockercompose build and remove static_image
// PATCH /api/v1/applications/{uuid}
const updateApp = new command.local.Command("update-application", {
    create: coolifyApiKey.apply(apiKey => {
        const body = JSON.stringify({
            buildPack: "dockercompose",
            dockerComposeRaw: dockerComposeRaw,
            staticImage: null,  // IMPORTANT: Remove nginx static image
            healthCheckEnabled: true,
            healthCheckPath: "/health",
            healthCheckMethod: "GET",
            healthCheckPort: 3000,
            healthCheckRetries: 5,
            healthCheckTimeout: 10,
            healthCheckInterval: 30,
            healthCheckStartPeriod: 15,
            healthCheckResponseText: "ok",
            healthCheckScheme: "http",
            healthCheckHost: "localhost",
        });

        const curlCmd = `curl -s -X PATCH "${coolifyApiUrl}/applications/${applicationUuid}" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${body}'`;

        return curlCmd;
    }),
});

// 2. Update environment variables
// POST /api/v1/applications/{uuid}/envs
const updateEnvVarsCmd = new command.local.Command("update-env-vars", {
    create: coolifyApiKey.apply(apiKey => {
        const body = JSON.stringify(envVars);

        const curlCmd = `curl -s -X POST "${coolifyApiUrl}/applications/${applicationUuid}/envs" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${body}'`;

        return curlCmd;
    }),
}, { dependsOn: [updateApp] });

// 3. Deploy the application
// GET /api/v1/deploy?uuid={uuid}&force=true
const deployApp = new command.local.Command("deploy-application", {
    create: coolifyApiKey.apply(apiKey => {
        const curlCmd = `curl -s -X GET "${coolifyApiUrl}/deploy?uuid=${applicationUuid}&force=true" ` +
            `-H "Authorization: Bearer ${apiKey}"`;

        return curlCmd;
    }),
}, { dependsOn: [updateEnvVarsCmd] });

// Export deployment info
export const applicationUrl = "https://startup-factory.qed.quest";
export const healthCheckUrl = `${applicationUrl}/health`;
export const applicationUuidOutput = applicationUuid;
