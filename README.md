# TRMNL Smash Plugin

A TRMNL plugin that displays your Super Smash Bros. Ultimate tournament performance on an E-ink display.

## Features
- **Season Stats:** Win rate, record, top characters.
- **Next Tournament:** Countdown to your next registered event.
- **Recent Results:** Placement and details from your last two tournaments.
- **Visuals:** High-contrast design optimized for TRMNL (800x480).

## Setup

### 1. Prerequisites
- Node.js (v18+)
- A Start.gg account and API Token.
- A TRMNL device and Webhook URL.

### 2. Installation
```bash
git clone <repo>
cd trmnl-smash-plugin
npm install
```

### 3. Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Edit `.env` with your details:
- `STARTGG_TOKEN`: Generate at [start.gg/admin/profile/developer](https://start.gg/admin/profile/developer).
- `STARTGG_SLUG`: Your profile slug (e.g., `user/mkleo`).
- `TRMNL_WEBHOOK_URL`: From your TRMNL dashboard (Plugin > Private Plugin > Webhook).

### 4. Local Preview
Generate a preview of the plugin view with mock data:
```bash
npm run preview
```
Open `preview.html` in your browser to verify the design.

### 5. Running
Start the plugin (fetches data and pushes to TRMNL):
```bash
npm start
```

## Deployment (Azure)

This project includes a minimal HTTP server for health checks, making it suitable for Azure App Service or Container Apps.

1. **Create an App Service (Linux, Node.js).**
2. **Set Environment Variables** in the Azure Portal (Configuration).
3. **Deploy** via VS Code Azure extension or GitHub Actions.
   - The app listens on `PORT` (default 8080).
   - It runs the fetch loop in the background.

## Development
- `src/startgg.ts`: Handles GraphQL queries.
- `src/index.ts`: Main logic loop.
- `trmnl_template.liquid`: The UI template.
