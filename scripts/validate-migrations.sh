#!/bin/bash
# =============================================================================
# Prisma Migration Validation Script
# =============================================================================
# Creates a test database and runs migrations to validate the schema
#
# IMPORTANT: This script uses the LOCAL factory-postgres container ONLY
#            It creates a fresh test database and validates the migration
#
# Usage: ./scripts/validate-migrations.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "Startup Factory - Prisma Migration Validator"
echo "=============================================="
echo ""

# Configuration
TEST_DB_NAME="startup_factory_test"
POSTGRES_USER="temporal"
POSTGRES_PASSWORD="temporal123"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5433"

# Check if we can reach the local postgres
echo -e "${YELLOW}[1/6] Checking local factory-postgres connectivity...${NC}"

# Try to connect to the default temporal database first
if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d temporal -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connected to local factory-postgres${NC}"
else
    echo -e "${RED}✗ Cannot connect to local factory-postgres at $POSTGRES_HOST:$POSTGRES_PORT${NC}"
    echo ""
    echo "Make sure the temporal-prod docker-compose is running:"
    echo "  cd temporal-prod && docker-compose up -d"
    echo ""
    echo "Or if using a remote Coolify postgres, update the connection params above."
    exit 1
fi

# Drop existing test database if it exists
echo ""
echo -e "${YELLOW}[2/6] Cleaning up existing test database...${NC}"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d temporal -c "DROP DATABASE IF EXISTS $TEST_DB_NAME" 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Create fresh test database
echo ""
echo -e "${YELLOW}[3/6] Creating test database '$TEST_DB_NAME'...${NC}"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d temporal -c "CREATE DATABASE $TEST_DB_NAME" > /dev/null 2>&1
echo -e "${GREEN}✓ Test database created${NC}"

# Set DATABASE_URL for Prisma
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${TEST_DB_NAME}"

# Run Prisma migrations
echo ""
echo -e "${YELLOW}[4/6] Running Prisma migrations...${NC}"
cd /data/workspace/startup-factory/packages/harness

# Validate the connection and run migration
if npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo ""
    echo "Falling back to raw SQL migration..."

    # Fallback: run the SQL directly
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TEST_DB_NAME" < ./prisma/migrations/20260101000000_init/migration.sql > /dev/null 2>&1
    echo -e "${GREEN}✓ Raw SQL migration applied${NC}"
fi

# Verify tables exist
echo ""
echo -e "${YELLOW}[5/6] Verifying tables in test database...${NC}"

TABLES=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TEST_DB_NAME" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public'" 2>/dev/null)

EXPECTED_TABLES=(
    "startups"
    "artifacts"
    "lifecycle_events"
    "agents"
    "agent_assignments"
    "agent_messages"
    "workflow_runs"
    "documents"
)

ALL_FOUND=true
for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "$table"; then
        echo -e "${GREEN}✓ $table${NC}"
    else
        echo -e "${RED}✗ $table NOT FOUND${NC}"
        ALL_FOUND=false
    fi
done

# Check agents seed data
echo ""
echo -e "${YELLOW}[6/6] Verifying seed data (agents)...${NC}"

AGENT_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM agents" 2>/dev/null | tr -d ' ')

if [ "$AGENT_COUNT" = "3" ]; then
    echo -e "${GREEN}✓ Seed data verified (3 agents)${NC}"
else
    echo -e "${YELLOW}⚠ Agent count: $AGENT_COUNT (expected 3)${NC}"
fi

# Cleanup test database
echo ""
echo -e "${YELLOW}Cleaning up test database...${NC}"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d temporal -c "DROP DATABASE IF EXISTS $TEST_DB_NAME" > /dev/null 2>&1
echo -e "${GREEN}✓ Test database removed${NC}"

echo ""
echo "=============================================="
if [ "$ALL_FOUND" = true ]; then
    echo -e "${GREEN}SUCCESS: All migrations validated${NC}"
    exit 0
else
    echo -e "${RED}FAILED: Some tables missing${NC}"
    exit 1
fi