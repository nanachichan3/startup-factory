import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

// Import modules
const mirofish = require("./mirofish");
const novu = require("./novu");

// Export MiroFish outputs
export const mirofishUrl = mirofish.applicationUrl;
export const mirofishApi = mirofish.apiEndpoint;
export const mirofishHealth = mirofish.healthEndpoint;
export const mirofishUuid = mirofish.appUuid;

// Export Novu outputs
export const novuUrl = novu.applicationUrl;
export const novuApi = novu.apiUrl;
export const novuHealth = novu.healthEndpoint;
export const novuUuid = novu.appUuid;
export const novuVersion = novu.novuVersion;
