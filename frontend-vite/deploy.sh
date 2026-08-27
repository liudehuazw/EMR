#!/bin/bash
# EMR Frontend Vite - Server Build & Deploy Script
# Usage: bash deploy.sh
# Run on server at: /opt/Electronic-medical-record/frontend-vite/

set -e

DEPLOY_DIR="/var/www/html"
REPO_DIR="/opt/Electronic-medical-record/frontend-vite"

echo "=== [1/3] Installing dependencies ==="
cd "$REPO_DIR"
chmod +x node_modules/.bin/vite 2>/dev/null || true
npm install --production=false

echo "=== [2/3] Building ==="
npm run build

echo "=== [3/3] Deploying dist to $DEPLOY_DIR ==="
sudo cp -r dist/* "$DEPLOY_DIR/"

echo "=== ✅ Deploy complete. Visit your site URL ==="
