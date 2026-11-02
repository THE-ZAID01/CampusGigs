#!/bin/bash
# Run ONCE on a fresh Ubuntu 22.04 EC2 instance:  bash aws/setup-ec2.sh
set -e
sudo apt-get update -y
sudo apt-get install -y git curl postgresql-client
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pm2
echo "Tools installed. Next: create server/.env, run npm run install:all, db:setup, build, pm2 start."
