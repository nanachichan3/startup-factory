import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import { encode } from "js-base64";

// Configuration
const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");

// Application details
const applicationUuid = "jock4w84c48s4o44gs0scso4";
const projectUuid = "k8kgkwocskk4o44gs0scso4";
const environmentName = "production";

// Environment variables to set on the application
const environmentVariables = {
  "DATABASE_URL": "postgresql://postgres:${COOLIFY_DATABASE_PASSWORD}@x0k4w8404wckwwcswg808gco:5432/projects",
  "TEMPORAL_ADDRESS": "",
  "TEMPORAL_NAMESPACE": "",
  "TEMPORAL_API_KEY": "",
  "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
  "PORT": "3000",
  "NODE_ENV": "production"
};

// Build the environment variables payload for Coolify
function buildEnvPayload(envVars: Record<string, string>): string {
  const envList = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    isBuildVariable: false,
    isPreserved: false
  }));

  return JSON.stringify(envList);
}

// 1. Update application environment variables
const updateEnvVars = new command.local.Command("update-env-vars", {
    create: coolifyApiKey.apply(apiKey => {
        const body = buildEnvPayload(environmentVariables);

        const curlCmd = `curl -s -X PATCH "${coolifyApiUrl}/applications/${applicationUuid}" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${body}'`;

        return curlCmd;
    }),
    delete: coolifyApiKey.apply(apiKey =>
        `curl -s -X PATCH "${coolifyApiUrl}/applications/${applicationUuid}" ` +
        `-H "Authorization: Bearer ${apiKey}" ` +
        `-H "Content-Type: application/json" ` +
        `-d '[]'`
    ),
});

// 2. Trigger application redeploy
const redeployApp = new command.local.Command("redeploy-app", {
    create: coolifyApiKey.apply(apiKey => {
        const body = JSON.stringify({
            deploymentUuid: applicationUuid,
            forceRebuild: false
        });

        const curlCmd = `curl -s -X POST "${coolifyApiUrl}/applications/${applicationUuid}/deployments" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${body}'`;

        return curlCmd;
    }),
}, { dependsOn: [updateEnvVars] });

// 3. Wait for deployment and check status
const checkDeployment = new command.local.Command("check-deployment-status", {
    create: coolifyApiKey.apply(apiKey => {
        const curlCmd = `curl -s -X GET "${coolifyApiUrl}/applications/${applicationUuid}/deployments" ` +
            `-H "Authorization: Bearer ${apiKey}" ` +
            `-H "Content-Type: application/json" ` +
            `| head -c 500`;

        return curlCmd;
    }),
}, { dependsOn: [redeployApp] });

// Export deployment info
export const applicationUrl = "https://bw440g0googo0gkkg8sw8oc4.qed.quest";
export const healthCheckUrl = `${applicationUrl}/health`;
export const applicationUuid = applicationUuid;
