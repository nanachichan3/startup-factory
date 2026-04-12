import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import { Base64 } from "js-base64";

// Configuration
const config = new pulumi.Config();
const coolifyApiUrl = "https://qed.quest/api/v1";
const coolifyApiKey = config.requireSecret("coolifyApiKey");

// Project/environment IDs (Claw project, production environment)
const projectUuid = "k8kgkwocskk4k084k0s0ko48";
const environmentUuid = "lc8cs08gsook8kcswsg0gowk";
const serverUuid = "bowowgww8cw08kokogk88oss";

// MiroFish app settings
const appName = "mirofish";
const imageName = "ghcr.io/nanachichan3/mirofish";
const imageTag = "latest";
const fqdn = "https://agg88ows44sw4so0o4cc0sk4.qed.quest";
const portsExposes = "80,5001";

// Build the JSON payload for creating the app
const createAppBody = JSON.stringify({
  project_uuid: projectUuid,
  environment_uuid: environmentUuid,
  server_uuid: serverUuid,
  name: appName,
  description: "MiroFish - Social Media Simulation for Self-Degree Framework",
  docker_registry_image_name: imageName,
  docker_registry_image_tag: imageTag,
  ports_exposes: portsExposes,
  domains: fqdn,
  build_pack: "dockerimage",
  health_check_enabled: false,
  redirect: "http",
  instant_deploy: true,
});

// Create the Coolify application via API
const createApp = new command.local.Command("mirofish-create-app", {
  create: coolifyApiKey.apply(apiKey => {
    const curlCmd = `curl -s -X POST "${coolifyApiUrl}/applications" ` +
      `-H "Authorization: Bearer ${apiKey}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Accept: application/json" ` +
      `-d '${createAppBody}'`;
    return curlCmd;
  }),
  opts: { ignoreChanges: ["create"] },
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
const deployApp = new command.local.Command("mirofish-deploy", {
  create: appUuid.apply(uuid => {
    const curlCmd = `curl -s -X POST "${coolifyApiUrl}/deployments" ` +
      `-H "Authorization: Bearer pwDP3qcsqlEFbvEfedDWaRJfhiSLKfECajoL94e178669eb8" ` +
      `-H "Content-Type: application/json" ` +
      `-d '{"application_uuid": "${uuid}", "force_rebuild": true}'`;
    return curlCmd;
  }),
  opts: { dependsOn: [createApp], ignoreChanges: ["create"] },
});

// Poll for app health — wait until the app is reachable
const waitForApp = new command.local.Command("mirofish-wait-health", {
  create: appUuid.apply(uuid => {
    // Try for up to 5 minutes (30 attempts × 10s)
    const curlCmd = `for i in $(seq 1 30); do ` +
      `status=$(curl -s -o /dev/null -w "%{http_code}" "https://agg88ows44sw4so0o4cc0sk4.qed.quest/api/simulation/list" 2>/dev/null); ` +
      `if [ "$status" = "200" ]; then echo "OK"; break; fi; ` +
      `echo "attempt $i: status=$status"; sleep 10; done`;
    return curlCmd;
  }),
  opts: { dependsOn: [deployApp], ignoreChanges: ["create"] },
});

// Test the API endpoint
const testApi = new command.local.Command("mirofish-test-api", {
  create: `curl -s --max-time 10 "https://agg88ows44sw4so0o4cc0sk4.qed.quest/api/simulation/list" 2>&1`,
  opts: { dependsOn: [waitForApp], ignoreChanges: ["create"] },
});

// Export results
export const applicationUrl = fqdn;
export const apiEndpoint = `${fqdn}/api/simulation/list`;
export const healthEndpoint = `${fqdn}/api/health`;
export const appUuid = appUuid;