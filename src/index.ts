import http from 'http';
import dotenv from 'dotenv';
import { StartGGSmashData } from './providers/startgg.js';
import { TrmnlClient } from './trmnl.js';

dotenv.config();

const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Smash TRMNL Plugin is running...\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL_MINUTES || '60', 10) * 60 * 1000;

async function runPlugin() {
  const { STARTGG_TOKEN, TRMNL_WEBHOOK_URL } = process.env;

  if (!STARTGG_TOKEN || !TRMNL_WEBHOOK_URL) {
    console.error('Missing required environment variables.');
    return;
  }

  const provider = new StartGGSmashData(STARTGG_TOKEN);
  const trmnl = new TrmnlClient(TRMNL_WEBHOOK_URL);

  try {
    console.log('Fetching data for authenticated user...');
    const payload = await provider.fetchData();
    console.log('Payload prepared:', JSON.stringify(payload, null, 2));

    await trmnl.pushData(payload);
    console.log('Data pushed to TRMNL successfully.');
  } catch (error) {
    console.error('Error in runPlugin:', error);
  }
}

runPlugin();
setInterval(runPlugin, REFRESH_INTERVAL);
