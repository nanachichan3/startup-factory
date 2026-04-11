import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

// Configuration
const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");

// Project and environment
const projectUuid = "k8kgkwocskk4k084k0s0ko48"; // Claw project
const serverUuid = "bowowgww8cw08kokogk88oss"; // localhost
const environmentName = "production";

// Docker compose configuration for the startup-factory harness
// IMPORTANT: For Coolify services, use pre-built images or GitHub App integration
// The docker-compose should NOT use 'build:' context for API-based deployments
const dockerComposeRaw = Buffer.from(`
version: '3.8'
services:
  startup-factory:
    image: ghcr.io/nanachichan3/startup-factory:latest
    environment:
      - PORT=3000
      - NODE_ENV=production
      - 'DATABASE_URL=\${DATABASE_URL}'
      - 'TEMPORAL_ADDRESS=\${TEMPORAL_ADDRESS}'
      - 'TEMPORAL_NAMESPACE=\${TEMPORAL_NAMESPACE}'
      - 'TEMPORAL_API_KEY=\${TEMPORAL_API_KEY}'
      - 'OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}'
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.startup-factory.rule=Host(\\\`startup-factory.qed.quest\\\`)"
      - "traefik.http.services.startup-factory.loadbalancer.server.port=3000"
      - "traefik.http.routers.startup-factory.tls=true"
      - "traefik.http.routers.startup-factory.tls.certresolver=letsencrypt"
    networks:
      - coolify

networks:
  coolify:
    external: true
`).toString('base64');

// 1. Create service with docker-compose
// POST /api/v1/services
const createService = new command.local.Command("create-service", {
    create: coolifyApiKey.apply(apiKey => {
        const body = JSON.stringify({
            name: "Startup Factory",
            docker_compose_raw: dockerComposeRaw,
            project_uuid: projectUuid,
            server_uuid: serverUuid,
            environment_name: environmentName,
        });

        const curlCmd = `curl -s -X POST "${coolifyApiUrl}/services" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${body}'`;

        return curlCmd;
    }),
});

// 2. Deploy the service
// GET /api/v1/deploy?uuid={uuid}&force=true
const deployService = new command.local.Command("deploy-service", {
    create: coolifyApiKey.apply(apiKey => {
        // Get the service UUID from createService output
        const curlCmd = `curl -s -X GET "${coolifyApiUrl}/services" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `| grep -o '"uuid":"[^"]*Startup Factory[^"]*"' ` +
            `| grep -o '[^"]*:[^"]*' | head -1`;

        return curlCmd;
    }),
});

// Export deployment info
export const applicationUrl = "https://startup-factory.qed.quest";
export const healthCheckUrl = `${applicationUrl}/health`;
