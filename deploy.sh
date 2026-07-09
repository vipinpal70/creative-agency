#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# --- Configuration ---
# Set the name of your PM2 application (defaults to package.json name)
PM2_APP_NAME="creativeos"
NGINX_SERVICE="nginx"

echo "=========================================="
# Get current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo "Starting deployment on branch: $CURRENT_BRANCH"
echo "=========================================="

# 1. Fetch all the latest changes
echo "Step 1: Pulling latest changes from git...🚀"
git pull origin "$CURRENT_BRANCH"

# 2. Install npm dependencies
echo "Step 2: Installing dependencies...😃🌐"
# Use npm ci for clean, deterministic builds if package-lock.json exists, fallback to npm install
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# 3. Build the application
echo "Step 3: Building the production application...🛠️"
npm run build

# 4. Restart or reload PM2 service
echo "Step 4: Reloading PM2 process...🚀"
if pm2 show "$PM2_APP_NAME" > /dev/null 2>&1; then
  echo "Reloading PM2 application '$PM2_APP_NAME' (zero-downtime)..."
  pm2 reload "$PM2_APP_NAME"
else
  echo "PM2 application '$PM2_APP_NAME' not running. Starting it now..."
  pm2 start npm --name "$PM2_APP_NAME" -- start
fi

# 5. Reload Nginx service
echo "Step 5: Reloading Nginx service...🌍"
# Nginx reload is preferred over restart as it is zero-downtime and fails safe
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl reload "$NGINX_SERVICE"
else
  echo "systemctl not found. Please reload Nginx manually (e.g., sudo service nginx reload)."
fi

echo "=========================================="
echo "Deployment successfully completed 🚀👽✅"
echo "=========================================="
