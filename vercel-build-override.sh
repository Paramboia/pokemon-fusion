#!/bin/bash

# Install only the glob package
npm install --legacy-peer-deps glob

# Run our custom build script
npm run build:vercel 