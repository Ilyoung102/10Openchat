# Overview

This is a conversational AI assistant web application built with React, Express, and OpenAI's API. The application features a modern chat interface with voice input capabilities, text-to-speech functionality, and pre-configured service prompts for various tasks (weather, news, cooking, health, etc.). It is designed as a mobile-first PWA with a focus on Korean language users, though it supports multilingual interactions.

The application evolved from a legacy Google Gemini-based implementation to the current OpenAI-based architecture, maintaining similar functionality while improving the backend structure.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 19 with TypeScript running on Vite for development and production builds.

**UI Components**: The application uses shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling. Components follow a consistent "new-york" style theme with customizable CSS variables for theming.

**State Management**: Local React state with React Query (@tanstack/react-query) for server state management. No global state library is used; state is managed at the component level and passed through props.

**Routing**: Uses wouter for client-side routing, providing a lightweight alternative to React Router.

**Chat Interface**: The main chat interface features:
- Message bubbles with markdown rendering using react-markdown
- Syntax highlighting for code blocks via react-syntax-highlighter
- Streaming responses from the OpenAI API
- Voice input using Web Speech API
- Text-to-speech playback using Web Audio API
- Service prompt templates for quick access to common queries

**Design Rationale**: The component-based architecture allows for modularity and reusability. The choice of lightweight libraries (wouter, clsx) keeps the bundle size small while maintaining rich functionality.

## Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript.

**Build System**: The application uses a custom build script that:
- Bundles the server with esbuild for optimized cold starts
- Builds the client with Vite
- Selectively bundles server dependencies (allowlist approach) to reduce syscall overhead
- Produces a single CommonJS output for production deployment

**Development Mode**: In development, the server runs with tsx (TypeScript executor) and uses Vite's middleware mode for HMR (Hot Module Reload) and SSR-like serving of the React application.

**API Structure**: RESTful API with a streaming endpoint at `/api/chat/stream` that:
- Accepts chat message history and new messages
- Forwards requests to OpenAI API
- Streams responses back to the client using Server-Sent Events (SSE)
- Integrates Tavily web search for real-time information retrieval

**Design Rationale**: The streaming architecture provides a responsive user experience for long-form AI responses. The custom build process optimizes for serverless/edge deployment scenarios where cold start time matters.

## Data Storage

**Current Implementation**: In-memory storage using a `MemStorage` class that implements an `IStorage` interface. This stores user data in Map structures.

**Database Schema**: PostgreSQL schema defined using Drizzle ORM with a users table containing:
- id (UUID primary key)
- username (unique text)
- password (text)

**Migration Strategy**: Drizzle Kit is configured for schema migrations with the schema defined in `shared/schema.ts` and migrations output to `./migrations`.

**Future Considerations**: The storage interface pattern allows easy migration from in-memory to PostgreSQL or other database backends without changing business logic.

## Authentication & Authorization

**Session Management**: Configured to use PostgreSQL-backed sessions via connect-pg-simple, though the current implementation uses in-memory storage. The infrastructure is in place for production-ready session storage.

**User Model**: Basic user schema with username/password fields. The insertUserSchema uses Zod for validation via drizzle-zod integration.

**Design Decision**: The modular storage interface allows the application to run without a database in development while supporting full database-backed authentication in production.

# External Dependencies

## AI Services

**OpenAI API**: Primary AI service for chat completions. The application:
- Uses streaming API for real-time response delivery
- Supports model selection (defaults to gpt-4o)
- Stores API key in localStorage (client-side)
- Implements error handling and retry logic

**Tavily Search API**: Web search integration for real-time information:
- Used when the AI needs current information (weather, news, etc.)
- Returns structured search results with titles, URLs, and content snippets
- Configured with basic search depth and max 5 results

**Legacy Google Gemini Integration**: The `attached_assets/legacy_code` directory contains a previous implementation using Google's Gemini API with text-to-speech capabilities. This code is retained for reference but not active in the current build.

## UI & Styling

**Tailwind CSS**: Utility-first CSS framework with custom configuration for:
- CSS variables-based theming
- Custom color palette (neutral base)
- Responsive breakpoints
- Animation utilities via tw-animate-css

**shadcn/ui**: Component library providing:
- 40+ pre-built accessible components
- Radix UI primitives for complex interactions
- Customizable through CSS variables
- Components are copied into the project (not npm dependency) for full control

**Lucide React**: Icon library providing consistent iconography throughout the application.

## Development Tools

**TypeScript**: Strict type checking with ESNext module resolution and bundler module strategy.

**Vite**: Build tool and dev server with plugins for:
- React Fast Refresh
- Runtime error modal (@replit/vite-plugin-runtime-error-modal)
- Cartographer (@replit/vite-plugin-cartographer) for Replit integration
- Custom meta images plugin for dynamic OpenGraph image URLs

**esbuild**: Used for server bundling in production with selective dependency bundling to optimize cold starts.

## Runtime Environment

**Node.js**: The application requires Node.js runtime and uses ES Modules (type: "module" in package.json).

**Environment Variables**:
- DATABASE_URL: PostgreSQL connection string (required for production)
- OPENAI_API_KEY: OpenAI API key (server-side)
- TAVILY_API_KEY: Tavily search API key
- API keys can also be managed client-side through localStorage

**Deployment Target**: The application is designed for Replit deployment with specific plugins and configuration, but can run on any Node.js hosting platform.