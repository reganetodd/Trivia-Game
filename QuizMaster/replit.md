# Koopan - Quiz Game Application

## Overview

Koopan is a real-time multiplayer quiz game built with React (frontend) and Express.js (backend). The application allows hosts to create quiz rooms where players can join and compete in live quiz sessions with real-time scoring and leaderboards.

## User Preferences

Preferred communication style: Simple, everyday language.
Application name: Koopan (updated from Quiz Master Pro on 2025-01-12)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket client for live game updates

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Real-time Communication**: WebSocket server for live game features
- **Database**: Drizzle ORM with PostgreSQL (configured for Neon serverless)
- **Development**: Hot reloading with tsx for server-side TypeScript

### Key Components

#### Game Flow
1. **Home Page**: Entry point where users can create or join games
2. **Host Interface**: Game management, question control, and player monitoring
3. **Player Interface**: Answer submission and live score tracking
4. **Real-time Updates**: WebSocket-based communication for instant game state synchronization

#### Database Schema
- **Games Table**: Room codes, game state, current question tracking
- **Players Table**: Player information, scores, and socket connections
- **Answers Table**: Response tracking with timing and correctness scoring

#### WebSocket Events
- Player join/leave notifications
- Game state changes (waiting, active, scoring, finished)
- Answer submissions and real-time scoring updates
- Leaderboard updates

## Data Flow

1. **Game Creation**: Host creates game → generates room code → WebSocket connection established
2. **Player Joining**: Players enter room code → join game → receive game state via WebSocket
3. **Question Flow**: Host starts question → timer begins → players submit answers → scoring calculation → leaderboard update
4. **Real-time Sync**: All game state changes broadcast via WebSocket to maintain consistency

## External Dependencies

### Frontend Dependencies
- **UI Components**: Comprehensive Radix UI component library
- **State Management**: TanStack Query for server state synchronization
- **Styling**: Tailwind CSS with shadcn/ui design system
- **Icons**: Lucide React for consistent iconography
- **Forms**: React Hook Form with Zod validation

### Backend Dependencies
- **Database**: Drizzle ORM with PostgreSQL adapter
- **WebSocket**: ws library for real-time communication
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: connect-pg-simple for session storage

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx with auto-restart on file changes
- **Database**: Drizzle schema migrations with push command

### Production Build
- **Frontend**: Vite build process generating optimized static assets
- **Backend**: esbuild bundling for Node.js deployment
- **Database**: PostgreSQL with connection pooling via Neon

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Separate development and production WebSocket configurations
- Automatic HTTPS/WSS protocol detection for secure connections

The application follows a monorepo structure with shared type definitions and schemas, enabling type-safe communication between frontend and backend components.