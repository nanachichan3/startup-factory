# Startup Factory Infrastructure - Pulumi IaC

## Overview

This directory contains Pulumi code to deploy the Startup Factory stack on Coolify, including:
- **Self-hosted Temporal** (workflow engine)
- **PostgreSQL** (Temporal's backend + Factory's database)
- **Startup Factory Harness** (Express API with Prisma)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Coolify Server                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  postgres    │  │  temporal    │  │  factory-api          │ │
│  │  (factory)    │  │              │  │  (Startup Factory     │ │
│  │              │  │  - Temporal  │  │   Harness)            │ │
│  │  Port: 5433  │  │    Web UI    │  │                       │ │
│  │              │  │  Port: 8088  │  │  Port: 3000 (traefik) │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│         │                 │                      │               │
│         └─────────────────┴──────────────────────┘               │
│                      (factory-network)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Coolify** instance with API access
2. **Pulumi CLI** installed (`npm install -g @pulumi/pulumi`)
3. **Docker** daemon accessible from Pulumi (for local preview)

## Deployment

### Quick Start

```bash
cd infra/pulumi

# Install dependencies
npm install

# Set required config
pulumi config set coolify:apiKey YOUR_API_KEY
pulumi config set coolify:serverUrl https://qed.quest/api/v1

# Preview changes
pulumi preview

# Deploy to Coolify
pulumi up
```

### Configuration

| Key | Description | Required |
|-----|-------------|----------|
| `coolify:apiKey` | Coolify API key from settings | Yes |
| `coolify:serverUrl` | Coolify API base URL | Yes |
| `coolify:projectUuid` | Target project UUID | No (auto-detected) |
| `coolify:environment` | Environment name | No (default: production) |

## Self-Hosted Temporal

This deployment uses **self-hosted Temporal** only — no Temporal Cloud.

### Temporal Services

- **temporal**: Core workflow engine (port 7233 GRPC, 8080 HTTP)
- **temporal-web**: Web UI for Temporal (port 8088 → 8080)
- **postgres**: PostgreSQL 16 for Temporal state (port 5433 → 5432)

### Temporal Configuration

```yaml
DB=postgres12
DB_PORT=5432
POSTGRES_USER=temporal
POSTGRES_PWD=temporal123
POSTGRES_SEEDS=postgres
POSTGRES_DB=temporal
```

The `POSTGRES_SEEDS=postgres` must match the **container_name** of the postgres service for internal DNS resolution.

## Environment Variables

### Factory API

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `TEMPORAL_ADDRESS` | Temporal GRPC address | `factory-temporal:7233` |
| `TEMPORAL_NAMESPACE` | Temporal namespace | `default` |
| `HTTP_BASIC_AUTH_USER` | Dashboard auth user | `admin` |
| `HTTP_BASIC_AUTH_PASS` | Dashboard auth password | `factory2026` |

### Temporal

| Variable | Description | Default |
|----------|-------------|---------|
| `DB` | Database type | `postgres12` |
| `DB_PORT` | Database port | `5432` |
| `POSTGRES_USER` | Database user | `temporal` |
| `POSTGRES_PWD` | Database password | `temporal123` |
| `POSTGRES_SEEDS` | Database hostname | `postgres` |
| `POSTGRES_DB` | Database name | `temporal` |

## Network Architecture

All services run on a shared `factory-network` bridge network, enabling:
- `factory-api` → `postgres:5432` (database)
- `factory-api` → `factory-temporal:7233` (Temporal GRPC)
- `temporal` → `postgres:5432` (Temporal backend)
- `temporal-web` → `factory-temporal:7233` (Temporal Web UI proxy)

**No public ports** are exposed for postgres or temporal — only the factory-api is accessible via Traefik.

## Ports Summary

| Service | Container Port | Host Port | Public |
|---------|---------------|-----------|--------|
| factory-api | 3000 | - | Yes (via Traefik) |
| factory-postgres | 5432 | 5433 | No |
| factory-temporal | 7233 | 7234 | No |
| factory-temporal-web | 8080 | 8088 | No |

## Local Development

For local development, use the docker-compose directly:

```bash
# From repo root
cd temporal-prod
docker-compose up -d

# Check health
curl http://localhost:3000/health

# View Temporal Web UI
open http://localhost:8088
```

## Troubleshooting

### Database Connection Failed ("Can't reach database server")

**Problem**: The `x0k4w8404wckwwcswg808gco` hostname is a Coolify internal DNS name that only resolves within the **same Coolify project/network**.

**Root Cause**: The temporal-prod docker-compose is NOT on the same Docker network as pg-nanachi (x0k4w8404wckwwcswg808gco). Coolify creates isolated networks per stack by default.

**Solutions**:

1. **Option A - Use factory-postgres (RECOMMENDED)**: Update DATABASE_URL to use the local `factory-postgres` container on the same compose network:
   ```
   DATABASE_URL=postgres://temporal:temporal123@factory-postgres:5432/temporal
   ```

2. **Option B - Connect to pg-nanachi network**: Add pg-nanachi's Coolify network to the temporal-prod compose:
   ```yaml
   networks:
     factory-network:
       external: false
     pg-nanachi-coolify:
       external: true
   ```
   Then use `${SERVICE_URL_POSTGRES}` magic variable for the connection string.

3. **Option C - Get pg-nanachi public URL**: In Coolify UI, go to pg-nanachi → General → Edit Compose File → Show Deployable Compose. Copy the public URL.

### Temporal "NOT CONNECTED"

**Problem**: `factory-api` shows "NOT CONNECTED" to Temporal.

**Root Cause**: The `factory` service in docker-compose needs access to `factory-temporal:7233` but may not be on the same Docker network.

**Fix**: Ensure the compose has `networks: - factory-network` on all services. The `POSTGRES_SEEDS=postgres` value must match the `container_name` of the postgres service.

### Prisma Migrations

```bash
# Run migrations against local factory-postgres
DATABASE_URL="postgresql://temporal:temporal123@localhost:5433/temporal" \
  npx prisma migrate deploy --schema=./packages/harness/prisma/schema.prisma

# Create test database
docker exec factory-postgres psql -U temporal -c "CREATE DATABASE startup_factory_test"

# Or use the validation script (creates test db, runs migrations, verifies, cleans up)
./scripts/validate-migrations.sh
```

## References

- [Temporal Docker Compose](https://github.com/temporalio/docker-compose)
- [Coolify Documentation](https://coolify.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)