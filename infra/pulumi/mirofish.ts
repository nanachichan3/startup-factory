import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import { execSync } from "child_process";

/**
 * MiroFish Deployment via Coolify
 * 
 * This script deploys MiroFish (social media simulation engine) to Coolify
 * using the dockerimage buildpack (pre-built Docker image, no git required).
 * 
 * Usage:
 *   export COOLIFY_API_KEY=<your-api-key>
 *   npm run up
 * 
 * The script will:
 *   1. Create the MiroFish app if it doesn't exist
 *   2. Deploy the latest Docker image
 *   3. Wait for the app to become healthy
 *   4. Validate the API endpoint
 */

const config = new pulumi.Config();

// Hardcoded values for this deployment
const APP_NAME = "mirofish";
const APP_DESCRIPTION = "MiroFish - Social Media Simulation for Self-Degree Framework";
const IMAGE_NAME = "ghcr.io/nanachichan3/mirofish";
const IMAGE_TAG = "latest";
const FQDN = "https://agg88ows44sw4so0o4cc0sk4.qed.quest";
const PORTS_EXPOSES = "80,5001";
const PROJECT_UUID = "k8kgkwocskk4k084k0s0ko48";
const ENVIRONMENT_NAME = "production";
const SERVER_UUID = "bowowgww8cw08kokogk88oss";

// Helper function to run coolify CLI commands
function coolify(args: string): string {
    const cmd = `coolify ${args}`;
    return execSync(cmd, { encoding: "utf-8", timeout: 60000 });
}

// Check if app already exists
function findExistingApp(): string | null {
    try {
        const output = coolify("app list --format json");
        const apps = JSON.parse(output);
        const existing = apps.find((a: any) => a.name === APP_NAME);
        return existing?.uuid || null;
    } catch {
        return null;
    }
}

// Create new MiroFish app via Coolify CLI
const existingUuid = findExistingApp();
const appUuid = existingUuid || (() => {
    pulumi.log.info("Creating new MiroFish app...");
    const createOutput = coolify(
        `app create dockerimage \
        --project-uuid ${PROJECT_UUID} \
        --environment-name "${ENVIRONMENT_NAME}" \
        --server-uuid ${SERVER_UUID} \
        --name ${APP_NAME} \
        --description "${APP_DESCRIPTION}" \
        --docker-registry-image-name ${IMAGE_NAME} \
        --docker-registry-image-tag ${IMAGE_TAG} \
        --ports-exposes "${PORTS_EXPOSES}" \
        --domains "${FQDN}" \
        --instant-deploy \
        --health-check-enabled=false \
        --format json`
    );
    const created = JSON.parse(createOutput);
    return created.uuid;
})();

pulumi.log.info(`MiroFish app UUID: ${appUuid}`);

// Start/deploy the application
const deployOutput = command.localCommand("mirofish-deploy", {
    create: `coolify app start ${appUuid}`,
    opts: { ignoreChanges: ["create"] },
});

// Wait for app to be reachable (poll up to 5 minutes)
const waitForHealthy = command.localCommand("mirofish-wait-healthy", {
    create: `
        ATTEMPTS=30
        for i in $(seq 1 $ATTEMPTS); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FQDN}/api/simulation/list" 2>/dev/null || echo "000")
            if [ "$STATUS" = "200" ]; then
                echo "OK: MiroFish API is healthy"
                exit 0
            fi
            echo "Attempt $i/$ATTEMPTS: status=$STATUS (waiting 10s)..."
            sleep 10
        done
        echo "FAILED: MiroFish did not become healthy after $ATTEMPTS attempts"
        exit 1
    `,
    opts: { dependsOn: [deployOutput], ignoreChanges: ["create"] },
});

// Validate the API
const validateApi = command.localCommand("mirofish-validate", {
    create: `curl -s --max-time 10 "${FQDN}/api/simulation/list" 2>&1`,
    opts: { dependsOn: [waitForHealthy], ignoreChanges: ["create"] },
});

// Validate frontend
const validateFrontend = command.localCommand("mirofish-validate-frontend", {
    create: `curl -s --max-time 10 "${FQDN}/" 2>&1 | grep -i "mirofish\|html" || echo "Frontend check failed"`,
    opts: { dependsOn: [waitForHealthy], ignoreChanges: ["create"] },
});

// Export outputs
export const applicationUrl = FQDN;
export const apiEndpoint = `${FQDN}/api/simulation/list`;
export const healthEndpoint = `${FQDN}/api/health`;
export const appUuid = appUuid;
export const frontendUrl = FQDN;
export const imageUsed = `${IMAGE_NAME}:${IMAGE_TAG}`;