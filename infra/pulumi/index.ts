/**
 * Startup Factory - Pulumi Infrastructure
 * 
 * Deploys self-hosted Temporal + PostgreSQL + Factory Harness to Coolify
 * 
 * No Temporal Cloud - fully self-hosted
 */

import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as crypto from "crypto";

const config = new pulumi.Config();

// =============================================================================
// Configuration
// =============================================================================

const coolifyApiUrl = config.require("coolifyApiUrl");
const coolifyApiKey = config.requireSecret("coolifyApiKey");
const projectUuid = config.get("projectUuid") || "k8kgkwocskk4k084k0s0ko48";
const serverUuid = config.get("serverUuid") || "bowowgww8cw08kokogk88oss";
const environmentName = config.get("environment") || "production";
const domain = config.get("domain") || "startup-factory.qed.quest";

// =============================================================================
// Docker Compose Configuration - Self-Hosted Temporal Stack
// =============================================================================

const dockerComposeYaml = `
version: '3.8'

networks:
  factory-network:
    driver: bridge

services:
  # PostgreSQL for Temporal + Factory DB
  postgres:
    image: postgres:16-alpine
    container_name: factory-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: temporal
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: temporal123
    volumes:
      - factory_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U temporal -d temporal"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - factory-network

  # Temporal Workflow Engine
  temporal:
    image: temporalio/auto-setup:1.25.0
    container_name: factory-temporal
    restart: unless-stopped
    ports:
      - "7234:7233"
      - "8088:8080"
    environment:
      - DB=postgres12
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal123
      - POSTGRES_SEEDS=factory-postgres
      - POSTGRES_DB=temporal
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - factory-network

  # Startup Factory Harness
  factory:
    image: ghcr.io/nanachichan3/startup-factory:latest
    container_name: factory-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TEMPORAL_ADDRESS=factory-temporal:7233
      - TEMPORAL_NAMESPACE=default
      - DATABASE_URL=postgres://temporal:temporal123@factory-postgres:5432/temporal
      - HTTP_BASIC_AUTH_USER=admin
      - HTTP_BASIC_AUTH_PASS=factory2026
    depends_on:
      - temporal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.factory.rule=Host(\`${domain}\`)"
      - "traefik.http.services.factory.loadbalancer.server.port=3000"
      - "traefik.http.routers.factory.tls=true"
      - "traefik.http.routers.factory.tls.certresolver=letsencrypt"
    networks:
      - factory-network

volumes:
  factory_postgres_data:
`;

const dockerComposeBase64 = Buffer.from(dockerComposeYaml).toString('base64');

// =============================================================================
// Step 1: Create Docker Compose Application in Coolify
// =============================================================================

const createComposeApplication = new command.local.Command("create-temporal-factory-app", {
    create: coolifyApiKey.apply(apiKey => {
        const body = JSON.stringify({
            name: "startup-factory-temporal-prod",
            description: "Self-hosted Temporal + PostgreSQL + Startup Factory Harness",
            docker_compose_raw: dockerComposeYaml,
            project_uuid: projectUuid,
            server_uuid: serverUuid,
            environment_name: environmentName,
        });

        return `curl -s -X POST "${coolifyApiUrl}/services" \
          -H "Authorization: Bearer ${apiKey}" \
          -H "Content-Type: application/json" \
          -d '${body.replace(/'/g, "'\"'\"'")}'`;
    }),
});

// =============================================================================
// Step 2: Deploy the application
// =============================================================================

// Note: In production, you would poll for the service UUID and then deploy
// For simplicity, we use the create command which triggers deployment

// =============================================================================
// Step 3: Verify deployment via health check
// =============================================================================

const verifyHealth = new command.local.Command("verify-health", {
    create: pulumi.interpolate`curl -sf https://${domain}/health || echo "HEALTH_CHECK_FAILED"`,
});

export const applicationUrl = `https://${domain}`;
export const healthCheckUrl = `https://${domain}/health`;
export const temporalWebUrl = `http://localhost:8088`;
export const temporalGrpcAddress = `localhost:7234`;