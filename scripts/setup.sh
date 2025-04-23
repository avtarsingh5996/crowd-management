#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Build backend
echo "Building backend..."
cd backend
npm install
npm run build
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy infrastructure
echo "Deploying infrastructure..."
cd infrastructure
npm install
cdk deploy

echo "Setup complete! Please update the following files with your AWS configuration:"
echo "- frontend/src/aws-exports.js"
echo "- backend/lambda/video-processor/.env" 