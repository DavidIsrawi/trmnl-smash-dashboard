import type { SmashPluginData } from './types.js';

export class TrmnlClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async pushData(payload: SmashPluginData) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merge_variables: payload }),
      });

      if (!response.ok) {
        throw new Error(`TRMNL API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to push data to TRMNL:', error);
      throw error;
    }
  }
}
