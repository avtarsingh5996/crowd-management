#!/bin/bash

# Build TypeScript code
npm run build

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy package.json and install dependencies
cp package.json dist/
cd dist
npm install --production
cd .. 