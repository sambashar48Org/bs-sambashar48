#!/bin/bash
cd /home/z/my-project
while true; do
    echo "[$(date)] Starting server..." >> /home/z/my-project/server.log
    node node_modules/.bin/next start -p 3000 --hostname 0.0.0.0 >> /home/z/my-project/server.log 2>&1
    echo "[$(date)] Server died, restarting in 2s..." >> /home/z/my-project/server.log
    sleep 2
done
