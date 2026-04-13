#!/bin/bash
# Start Mem0 in background and capture output
cd /app
python3 -c "
import sys
sys.stdout.flush()
stderr_fd = sys.stderr.fileno()
" 2>&1 || true

# Run uvicorn in background, capture PID
timeout 10 uvicorn main:app --host 0.0.0.0 --port 5000 &
UVICORN_PID=$!

# Wait to see if it crashes
sleep 5

# Check if still running
if kill -0 $UVICORN_PID 2>/dev/null; then
    echo "Mem0 started successfully!"
    wait $UVICORN_PID
else
    echo "Mem0 crashed on startup!"
    # Sleep forever so we can exec in and check
    echo "PID of sleep: $$"
    sleep 36000
fi
