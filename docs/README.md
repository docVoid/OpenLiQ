# OpenLiQ Documentation

## Overview

OpenLiQ is an open-source, real-time quiz game platform built with modern web technologies.

## Project Structure

```
OpenLiQ/
├── backend/
│   └── OpenLiQ.Api/          # ASP.NET Core 8 Web API
│       ├── Controllers/
│       ├── Data/
│       ├── Hubs/             # SignalR hubs
│       ├── Models/
│       └── Program.cs
├── frontend/                 # Next.js 14 application
│   └── src/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       └── lib/
├── docs/                     # Documentation
├── docker-compose.yml        # Docker Compose configuration
├── .gitignore
└── OpenLiQ.sln
```

## Technology Stack

### Backend

- **Framework**: ASP.NET Core 8
- **Database**: SQL Server
- **ORM**: Entity Framework Core
- **Real-time**: SignalR

### Frontend

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time Client**: @microsoft/signalr

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Database**: SQL Server 2022

## Getting Started

### Prerequisites

- Docker & Docker Compose
- .NET 8 SDK (for local development)
- Node.js 18+ (for local development)

### Running with Docker Compose

```bash
docker-compose up -d
```

This will start:

- SQL Server on port 1433
- Backend API on port 5000
- Frontend on port 3000

### Local Development

#### Backend

```bash
cd backend/OpenLiQ.Api
dotnet restore
dotnet run
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check

## SignalR Hubs

- **GameHub** (ws://localhost:5000/hubs/game)
  - Methods: `SendWelcome`, `StartGame`, `EndGame`
  - Events: `ReceiveWelcome`, `GameStarted`, `GameEnded`

## Environment Configuration

### Backend (.env)

```
DefaultConnection=Server=localhost,1433;Database=OpenLiQ;User Id=sa;Password=OpenLiQ@2024;
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Contributing

Please follow the existing code structure and conventions.

## License

MIT License - see LICENSE file for details
