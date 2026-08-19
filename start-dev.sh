#!/bin/bash

# Source NVM to get access to Node.js and npm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/juanb/dna2-workspace/pybpm-ui
pkill -f "next dev" 2>/dev/null || true
sleep 3
echo "Starting Next.js dev server on port 3000..."
npx next dev --port 3000 > /tmp/nextjs-dev.log 2>&1 &
DEV_PID=$!
disown $DEV_PID
echo "Dev server started with PID: $DEV_PID"
sleep 20
if kill -0 $DEV_PID 2>/dev/null; then
    echo "✓ Server running successfully"
    curl -s http://localhost:3000/login | grep -o '<title>[^<]*</title>' || echo "Page not ready yet"
else
    echo "✗ Server failed to start"
fi
echo ""
echo "=== Recent logs ==="
tail -40 /tmp/nextjs-dev.log
