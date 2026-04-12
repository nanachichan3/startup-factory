import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as fs from "fs";
import * as path from "path";

// Configuration
const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");

// Project/environment IDs (Claw project, production environment)
const projectUuid = "k8kgkwocskk4k084k0s0ko48";
const environmentUuid = "lc8cs08gsook8kcswsg0gowk";
const serverUuid = "bowowgww8cw08kokogk88oss";

// Novu app settings
const appName = "novu";
const imageName = "ghcr.io/nanachichan3/novu-deploy";
const imageTag = "master";
const buildPack = "dockercompose";
const portsExposes = "80";
const fqdn = "https://p12hfimcgxzt0uj5d54knds4.qed.quest";

// Novu version to deploy (v3.12.0 is more stable than v3.14.0 for self-hosted)
const novuVersion = "v3.12.0";

// Docker compose content for Novu with MongoDB and Redis
const dockerComposeContent = `
name: novu
services:
  redis:
    image: redis:alpine
    container_name: novu_redis
    restart: unless-stopped
    networks:
      - coolify

  mongodb:
    image: mongo:8.0.17
    container_name: novu_mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: novuadmin
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - coolify

  api:
    image: "ghcr.io/novuhq/novu/api:${NOVU_VERSION}"
    depends_on:
      - mongodb
      - redis
    container_name: novu_api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      API_ROOT_URL: \${API_ROOT_URL}
      PORT: "3000"
      FRONT_BASE_URL: \${FRONT_BASE_URL}
      MONGO_URL: "mongodb://novuadmin:\${MONGO_PASSWORD}@mongodb:27017/novu-db?authSource=admin"
      MONGO_MIN_POOL_SIZE: "1"
      MONGO_MAX_POOL_SIZE: "10"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: ""
      REDIS_DB_INDEX: "2"
      S3_LOCAL_STACK: "false"
      S3_BUCKET_NAME: novu-db
      S3_REGION: us-east-1
      AWS_ACCESS_KEY_ID: ""
      AWS_SECRET_ACCESS_KEY: ""
      JWT_SECRET: \${JWT_SECRET}
      STORE_ENCRYPTION_KEY: \${STORE_ENCRYPTION_KEY}
      NOVU_SECRET_KEY: \${NOVU_SECRET_KEY}
      SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME: 15d
      SENTRY_DSN: ""
      NEW_RELIC_ENABLED: "false"
      NEW_RELIC_APP_NAME: novu-api
      NEW_RELIC_LICENSE_KEY: ""
      MONGO_AUTO_CREATE_INDEXES: "true"
      IS_API_IDEMPOTENCY_ENABLED: "false"
      IS_API_RATE_LIMITING_ENABLED: "false"
      IS_NEW_MESSAGES_API_RESPONSE_ENABLED: "true"
      IS_V2_ENABLED: "true"
      IS_EMAIL_INLINE_CSS_DISABLED: "false"
      IS_USE_MERGED_DIGEST_ID_ENABLED: "false"
      BROADCAST_QUEUE_CHUNK_SIZE: "100"
      MULTICAST_QUEUE_CHUNK_SIZE: "100"
      IS_SELF_HOSTED: "true"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.novu-api.rule=Host(\`api.novu.qed.quest\`)"
      - "traefik.http.services.novu-api.loadbalancer.server.port=3000"
      - "traefik.http.routers.novu-api.tls=true"
      - "traefik.http.routers.novu-api.tls.certresolver=letsencrypt"
    networks:
      - coolify

  worker:
    image: "ghcr.io/novuhq/novu/worker:${NOVU_VERSION}"
    depends_on:
      - mongodb
      - redis
    container_name: novu_worker
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3004"
      MONGO_URL: "mongodb://novuadmin:\${MONGO_PASSWORD}@mongodb:27017/novu-db?authSource=admin"
      MONGO_MAX_POOL_SIZE: "10"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: ""
      REDIS_DB_INDEX: "2"
      STORE_ENCRYPTION_KEY: \${STORE_ENCRYPTION_KEY}
      SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME: 15d
      SENTRY_DSN: ""
      NEW_RELIC_ENABLED: "false"
      NEW_RELIC_APP_NAME: novu-worker
      NEW_RELIC_LICENSE_KEY: ""
      BROADCAST_QUEUE_CHUNK_SIZE: "100"
      MULTICAST_QUEUE_CHUNK_SIZE: "100"
      API_ROOT_URL: http://api:3000
      IS_EMAIL_INLINE_CSS_DISABLED: "false"
      IS_USE_MERGED_DIGEST_ID_ENABLED: "false"
    networks:
      - coolify

  ws:
    image: "ghcr.io/novuhq/novu/ws:${NOVU_VERSION}"
    depends_on:
      - mongodb
      - redis
    container_name: novu_ws
    restart: unless-stopped
    environment:
      PORT: "3002"
      NODE_ENV: production
      MONGO_URL: "mongodb://novuadmin:\${MONGO_PASSWORD}@mongodb:27017/novu-db?authSource=admin"
      MONGO_MAX_POOL_SIZE: "10"
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: ""
      JWT_SECRET: \${JWT_SECRET}
      NEW_RELIC_ENABLED: "false"
      NEW_RELIC_APP_NAME: novu-ws
      NEW_RELIC_LICENSE_KEY: ""
    networks:
      - coolify

  dashboard:
    image: "ghcr.io/novuhq/novu/dashboard:${NOVU_VERSION}"
    depends_on:
      - api
      - worker
    container_name: novu_dashboard
    restart: unless-stopped
    environment:
      VITE_API_HOSTNAME: https://api.novu.qed.quest
      VITE_SELF_HOSTED: "true"
      VITE_WEBSOCKET_HOSTNAME: https://ws.novu.qed.quest
      VITE_LEGACY_DASHBOARD_URL: https://novu.qed.quest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.novu.rule=Host(\`novu.qed.quest\`)"
      - "traefik.http.services.novu.loadbalancer.server.port=4000"
      - "traefik.http.routers.novu.tls=true"
      - "traefik.http.routers.novu.tls.certresolver=letsencrypt"
    networks:
      - coolify

volumes:
  mongodb_data:

networks:
  coolify:
    external: true
`.replace(/\$\{NOVU_VERSION\}/g, novuVersion);

// Write docker-compose file to deploy directory
const deployDir = "/tmp/novu-deploy";
const dockerComposePath = path.join(deployDir, "docker-compose.yaml");

// Ensure deploy directory exists
const ensureDir = new command.local.Command("novu-ensure-dir", {
  create: `mkdir -p ${deployDir}`,
});

// Write docker-compose file
const writeDockerCompose = new command.local.Command("novu-write-compose", {
  create: `cat > ${dockerComposePath} << 'EOFCOMPOSE'
${dockerComposeContent}
EOFCOMPOSE`,
  opts: { dependsOn: [ensureDir] },
});

// Create the Coolify application via API (dockercompose build pack)
const createAppBody = JSON.stringify({
  project_uuid: projectUuid,
  environment_uuid: environmentUuid,
  server_uuid: serverUuid,
  name: appName,
  description: `Novu self-hosted notification infrastructure (${novuVersion})`,
  docker_registry_image_name: imageName,
  docker_registry_image_tag: imageTag,
  ports_exposes: portsExposes,
  domains: fqdn,
  build_pack: buildPack,
  health_check_enabled: false,
  redirect: "https",
  docker_compose_raw: dockerComposeContent,
  build_args: JSON.stringify({
    NOV_U_VERSION: novuVersion,
  }),
});

const createApp = new command.local.Command("novu-create-app", {
  create: coolifyApiKey.apply(apiKey => {
    const curlCmd = `curl -s -X POST "${coolifyApiUrl}/applications" ` +
      `-H "Authorization: Bearer ${apiKey}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Accept: application/json" ` +
      `-d '${createAppBody.replace(/'/g, "'\"'\"'")}'`;
    return curlCmd;
  }),
  opts: { dependsOn: [writeDockerCompose], ignoreChanges: ["create"] },
});

// Parse the created app UUID from the response
const appUuid = createApp.stdout.apply(stdout => {
  try {
    const response = JSON.parse(stdout.trim());
    return response.data?.uuid || response.uuid || "";
  } catch {
    return "";
  }
});

// Deploy the newly created application
const deployApp = new command.local.Command("novu-deploy", {
  create: appUuid.apply(uuid => {
    const curlCmd = `curl -s -X POST "${coolifyApiUrl}/deployments" ` +
      `-H "Authorization: Bearer ${coolifyApiKey}" ` +
      `-H "Content-Type: application/json" ` +
      `-d '{"application_uuid": "${uuid}", "force_rebuild": true}'`;
    return curlCmd;
  }),
  opts: { dependsOn: [createApp], ignoreChanges: ["create"] },
});

// Wait for deployment to complete
const waitForDeploy = new command.local.Command("novu-wait-deploy", {
  create: appUuid.apply(uuid => {
    const curlCmd = `for i in $(seq 1 60); do ` +
      `status=$(curl -s -o /dev/null -w "%{http_code}" "https://api.novu.qed.quest/v1/health-check" 2>/dev/null); ` +
      `if [ "$status" = "200" ]; then echo "OK"; break; fi; ` +
      `echo "attempt $i: status=$status"; sleep 10; done`;
    return curlCmd;
  }),
  opts: { dependsOn: [deployApp], ignoreChanges: ["create"] },
});

// Test the health check endpoint
const testHealth = new command.local.Command("novu-test-health", {
  create: `curl -s --max-time 30 "https://api.novu.qed.quest/v1/health-check" 2>&1`,
  opts: { dependsOn: [waitForDeploy], ignoreChanges: ["create"] },
});

// Test the dashboard endpoint
const testDashboard = new command.local.Command("novu-test-dashboard", {
  create: `curl -s -o /dev/null -w "%{http_code}" "https://novu.qed.quest/" 2>&1`,
  opts: { dependsOn: [waitForDeploy], ignoreChanges: ["create"] },
});

// Export results
export const applicationUrl = "https://novu.qed.quest";
export const apiUrl = "https://api.novu.qed.quest";
export const healthEndpoint = `https://api.novu.qed.quest/v1/health-check`;
export const appUuid = appUuid;
export const novuVersion = novuVersion;
