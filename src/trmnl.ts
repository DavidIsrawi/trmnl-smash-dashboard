import type { SmashPluginData } from "./types.js";
import { withRetry } from "./utils.js";

export class TrmnlClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async pushData(payload: SmashPluginData) {
    await withRetry(async () => {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ merge_variables: payload }),
      });

      if (!response.ok) {
        throw new Error(
          `TRMNL API Error: ${response.status} ${response.statusText}`,
        );
      }
    }, "Pushing data to TRMNL");
  }
}
