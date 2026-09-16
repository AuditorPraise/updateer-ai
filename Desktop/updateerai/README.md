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

- Docker & Docker Compose (recommended)
- Node.js 16+ (for standalone frontend)
- Go 1.20+ (for standalone backend)
- PostgreSQL 12+ (if not using Docker)

### Option 1: Docker Compose (Recommended)

Bring up the entire stack (Postgres, MinIO, Go backend) with one command:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on localhost:5432
- **MinIO** on localhost:9000 (+ console on :9001)
- **Backend API** on localhost:8080

Then start the frontend:

```bash
cd Desktop/updateerai
npm install
npm run dev  # Frontend on http://localhost:5173
```

Verify the backend is healthy:

```bash
curl http://localhost:8080/health
# Expected: OK
```

### Option 2: Manual Setup

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

## Running Tests

### Backend Tests

```bash
cd Desktop/updateerai/backend
go test ./...  # Run all tests
go test -v ./...  # Verbose output
```

Tests include:
- Token generation and expiration (main_test.go)
- HTTP handler validation (handlers_test.go)
- MinIO storage operations (storage/minio_test.go)

### Frontend Tests

```bash
cd Desktop/updateerai
npm test  # Runs Vitest suite
```

### CI/CD Pipeline

Every push runs:
- ESLint (frontend code style)
- TypeScript type check
- golangci-lint (backend code quality)
- Security checks (detects hardcoded secrets, committed .env)
- All tests must pass before merge

View workflows: `.github/workflows/`

## Project Structure

```
Desktop/updateerai/
├── frontend/              # React + TypeScript application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/               # Go + Echo REST API
│   ├── main.go           # Entry point (~1263 LOC)
│   ├── storage/          # MinIO client
│   ├── pkg/logger/       # Structured logging
│   ├── handlers/         # HTTP handlers (to be created)
│   ├── models/           # Data models (to be created)
│   ├── *_test.go         # Unit tests
│   └── go.mod
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── docker-compose.yml    # Local development services
└── README.md            # This file
```

## Environment Variables

**Required:**
- `MINIO_ROOT_PASSWORD` — MinIO admin password (read from env, no hardcoded defaults)
- `RESEND_API_KEY` — Resend email API key
- `APP_URL` — Public URL for unsubscribe links

**Optional:**
- `VITE_BACKEND_URL` — Frontend API endpoint (defaults to localhost:8080)
- `DB_URL` — PostgreSQL connection string
- `TUNNEL_TOKEN` — Cloudflare Tunnel token
- `LOG_LEVEL` — debug, info (default), warn, error
- `LOG_FORMAT` — text (default), json

See `.env.example` for a complete list and descriptions.

## Architecture

### Request Flow

```
Browser → Frontend (React/Vite, :5173)
   ↓
API Calls ↔ Backend (Go/Echo, :8080)
   ↓
Database: PostgreSQL (:5432)
File Storage: MinIO (:9000)
Email Delivery: Resend (external)
```

### Backend Handlers

- `/api/v1/auth/*` — Login, signup, logout
- `/api/v1/profile` — User profile CRUD
- `/api/v1/contacts` — Contact list management
- `/api/v1/designs` — Email template storage
- `/api/v1/domains` — Email domain registration
- `/api/v1/send` — Send campaigns via Resend
- `/api/v1/analytics/*` — Campaign performance
- `/health` — Service health check

## Known Issues & Roadmap

### Current Limitations
- ⚠️ `main.go` is 1263 LOC and needs modularization (handlers/, models/)
- ⚠️ Minimal test coverage (unit tests added, integration tests pending)
- ⚠️ No OpenAPI/Swagger documentation
- ⚠️ Error handling is basic

### Completed
- ✅ Hardcoded secrets removed (MINIO_ROOT_PASSWORD required from env)
- ✅ `.env` file excluded from git (added to .gitignore)
- ✅ Structured logging package added (log/slog)
- ✅ ESLint + Prettier + golangci-lint configs
- ✅ GitHub Actions CI pipeline
- ✅ Unit tests (auth, handlers, storage)
- ✅ Docker Compose for local development

### High Priority

1. **Refactor `main.go`** into backend/handlers/, backend/models/ packages
2. **Add integration tests** using testcontainers for Postgres/MinIO
3. **Frontend testing** with Vitest + React Testing Library
4. **API documentation** (OpenAPI/Swagger)
5. **Input validation middleware** for emails, domains, request bodies

## Deployment

### Local/Docker

```bash
docker compose up -d
```

### Production (Cloudflare Tunnel)

```bash
cloudflared service install --token $TUNNEL_TOKEN
```

Ensure `APP_URL` points to your public tunnel domain.

## Security Checklist

✅ No hardcoded secrets (MINIO_ROOT_PASSWORD must come from env)
✅ `.env` file in .gitignore
✅ `.env.example` with placeholder values
✅ JWT tokens expire in 72 hours
✅ Passwords hashed with bcrypt
✅ CORS configured for trusted origins
✅ CI runs security checks on every push

⚠️ **If secrets are ever leaked:**
1. Rotate the real credentials immediately
2. Force push history rewrite with `git filter-branch` (advanced)
3. Or accept the breach and rotate all secrets

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. **Write tests first** (TDD), then implement the feature
3. Ensure tests pass: `go test ./...` and `npm test --prefix Desktop/updateerai`
4. Commit tests and code together in focused commits
5. Push to your fork and open a PR
6. CI must pass (lint, typecheck, tests) before merge

### Commit Message Convention

```
feat: add email scheduling
fix: resolve unsubscribe link redirect
test: add tests for Login handler
refactor: split main.go into packages
docs: update README with test instructions
```

## License

[Add your license here — e.g., MIT, Apache 2.0]

## Support

For questions or issues:
- Open a [GitHub Issue](https://github.com/AuditorPraise/updateer-ai/issues)
- Check existing documentation
- Review test files for usage examples

---

**Last Updated**: 2026-09-16  
**Maintainer**: @AuditorPraise  
**Status**: Early-stage SaaS (pre-production)
