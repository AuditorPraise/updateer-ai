# Updateer AI

**AI Email Generator and Marketing Manager** — A full-stack SaaS platform for automated email generation, campaign management, and audience broadcasting.

## Overview

Updateer AI combines:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Go + Echo framework
- **Database**: PostgreSQL
- **File Storage**: MinIO (S3-compatible) + Resend for email delivery
- **Infrastructure**: Cloudflare Tunnels for secure access

This is an early-stage product SaaS application designed to help users create and manage AI-powered email campaigns at scale.

## Quick Start

### Prerequisites

- Node.js 16+ (frontend)
- Go 1.20+ (backend)
- PostgreSQL 12+ (database)
- MinIO (file storage) or AWS S3
- Docker (optional, for local services)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/AuditorPraise/updateer-ai.git
   cd updateer-ai/Desktop/updateerai
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual secrets and configuration
   ```

3. **Frontend Setup**
   ```bash
   npm install
   npm run dev  # Development server on http://localhost:5173
   ```

4. **Backend Setup**
   ```bash
   cd backend
   go mod download
   go run main.go  # Starts on port 8080
   ```

## Project Structure

```
Desktop/updateerai/
├── frontend/              # React + TypeScript application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/               # Go + Echo REST API
│   ├── main.go           # Entry point (~1263 LOC - needs refactoring)
│   ├── storage/          # MinIO client
│   ├── pkg/logger/       # Structured logging
│   ├── models/           # Data models (User, Profile, Subscription)
│   ├── handlers/         # HTTP handlers
│   ├── middleware/       # Auth, CORS, etc.
│   └── go.mod
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
└── docker-compose.yml    # Local development services
```

## Environment Variables

**Required:**
- `MINIO_ROOT_PASSWORD` — MinIO admin password
- `RESEND_API_KEY` — Resend email API key
- `APP_URL` — Public URL for unsubscribe links

**Optional:**
- `VITE_BACKEND_URL` — Frontend API endpoint (defaults to localhost:8080)
- `DATABASE_URL` — PostgreSQL connection string
- `TUNNEL_TOKEN` — Cloudflare Tunnel token for remote access
- `LOG_LEVEL` — debug, info (default), warn, error
- `LOG_FORMAT` — text (default), json

See `.env.example` for a complete list and descriptions.

## Development Workflow

### Running Locally with Docker Compose

```bash
docker-compose up -d
npm run dev        # Frontend
go run backend/main.go  # Backend
```

### Code Quality

- **Linting**: ESLint (frontend), golangci-lint (backend)
- **Formatting**: Prettier (frontend), gofmt (backend)
- **Type Checking**: TypeScript, Go compiler
- **Testing**: (Currently no test suite — high priority for refactoring)

## Known Issues & Roadmap

- ⚠️ `main.go` is 1263 LOC and needs modularization
- ⚠️ No automated tests
- ⚠️ Error handling is basic (need observability layer)
- ✅ Fixed: Hardcoded MinIO secret removed
- ✅ Fixed: `.env` file no longer committed
- ✅ Added: Structured logging with `log/slog`
- ✅ Added: ESLint + Prettier configs
- ✅ Added: GitHub Actions CI pipeline

### High Priority

1. Add unit tests for backend handlers
2. Split `main.go` into logical packages
3. Add input validation middleware
4. Implement API documentation (OpenAPI/Swagger)
5. Add more structured logging to core handlers

## Deployment

### Local/Docker
```bash
docker-compose -f docker-compose.prod.yml up
```

### Production (Cloudflare Tunnel)
```bash
cloudflared service install --token $TUNNEL_TOKEN
```

Ensure `APP_URL` env var points to your public tunnel domain.

## Architecture Notes

- **Frontend → Backend**: REST API on port 8080
- **Backend → MinIO**: S3-compatible object storage for uploaded files
- **Backend → Resend**: Email delivery service
- **Backend → PostgreSQL**: Primary database for users, campaigns, email logs
- **Public Access**: Cloudflare Tunnel for secure external routing

## Security Notes

⚠️ **Never commit secrets to this repo:**
- `.env` files (use `.env.example` instead)
- API keys, tokens, or credentials
- Database passwords
- Private keys

Use `.gitignore` and rotate secrets if accidentally exposed.

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Commit changes with clear messages
3. Push to your fork and open a Pull Request
4. Ensure CI passes (lint, typecheck) before merge

## License

[Add your license here — e.g., MIT, Apache 2.0]

## Support

For questions or issues:
- Open a [GitHub Issue](https://github.com/AuditorPraise/updateer-ai/issues)
- Check existing documentation in the repo

---

**Last Updated**: 2026-09-16
**Maintainer**: @AuditorPraise
