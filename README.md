# Pokemon Fusion

A web application that allows users to create unique Pokémon combinations using AI-powered image generation.

## Overview

Pokemon Fusion is an innovative web application that lets users combine any two Pokémon to create unique fusion artwork. The application uses advanced AI image generation to create high-quality, seamless fusions while maintaining the authentic Pokémon art style.

## Key Features

- 🎨 Create unique Pokémon fusions using AI
- 📚 Browse and search the complete Pokémon database
- ⭐ Save favorite combinations
- 🌟 View popular community fusions
- 📱 Responsive design for all devices

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Supabase, Clerk Authentication
- **AI Integration:** Gemini API (pending broad release)

## Documentation

For detailed information about our AI integration plans and current status, please see:
- [Gemini API Requirements and Status](requirements/GEMINI_API_REQUIREMENTS.md)

## Getting Started

1. Clone and install:
   ```bash
   git clone https://github.com/yourusername/pokemon-fusion.git
   cd pokemon-fusion
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

## Current Status

The application is currently using a fallback image generation service while waiting for Gemini API's image generation capabilities to become broadly available. See our [Gemini API Requirements](requirements/GEMINI_API_REQUIREMENTS.md) document for detailed status and implementation plans.
