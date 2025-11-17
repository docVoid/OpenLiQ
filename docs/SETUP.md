# OpenLiQ - Setup Instructions

## Quick Start with Docker Compose

```bash
# Clone or navigate to the repository
cd OpenLiQ

# Start all services
docker-compose up -d

# Wait for all services to be healthy
docker-compose ps
```

Services will be available at:

- Frontend: http://localhost:3000
- API: http://localhost:5000
- SQL Server: localhost:1433 (sa / OpenLiQ@2024)

## Development Setup

### Backend Development

1. Install .NET 8 SDK
2. Navigate to backend directory
   ```bash
   cd backend/OpenLiQ.Api
   ```
3. Restore packages
   ```bash
   dotnet restore
   ```
4. Update the connection string in `appsettings.Development.json` if needed
5. Run migrations (when available)
   ```bash
   dotnet ef database update
   ```
6. Start the API
   ```bash
   dotnet run
   ```

API will be available at `https://localhost:7000` (or configured port)

### Frontend Development

1. Install Node.js 18+
2. Navigate to frontend directory
   ```bash
   cd frontend
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Create `.env.local` file
   ```bash
   cp .env.local.example .env.local
   ```
5. Update `NEXT_PUBLIC_API_URL` to point to your backend
6. Start development server
   ```bash
   npm run dev
   ```

Frontend will be available at `http://localhost:3000`

## Database

### Connection String

```
Server=localhost,1433;Database=OpenLiQ;User Id=sa;Password=OpenLiQ@2024;Encrypt=true;TrustServerCertificate=true;
```

### First Time Setup

1. Ensure SQL Server is running
2. Run Entity Framework migrations
   ```bash
   cd backend/OpenLiQ.Api
   dotnet ef database update
   ```

## Troubleshooting

### SQL Server Connection Issues

- Ensure the container is running: `docker-compose ps`
- Check logs: `docker-compose logs mssql`
- Verify credentials in `docker-compose.yml`

### Port Conflicts

- Edit `docker-compose.yml` to use different ports if needed
- Update corresponding configuration files

### Node Modules Issues

- Delete `node_modules` folder and reinstall
  ```bash
  rm -rf frontend/node_modules
  npm install
  ```

## Next Steps

1. Add authentication (JWT/OpenID Connect)
2. Implement database models for games, questions, and users
3. Create quiz game endpoints
4. Build UI components for quiz game flow
5. Implement real-time game state updates via SignalR
