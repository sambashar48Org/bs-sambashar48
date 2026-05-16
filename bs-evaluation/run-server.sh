#!/bin/bash
cd /home/z/my-project
nohup node node_modules/.bin/next start -p 3000 --hostname 0.0.0.0 > /home/z/my-project/server.log 2>&1 &
echo $! > /home/z/my-project/server.pid
echo "Started PID: $(cat /home/z/my-project/server.pid)"
