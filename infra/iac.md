# Infrastructure as Code (IaaC)

This project follows IaaC principles to ensure reproducible environments.

## Deployment Specification

The environment is defined as a set of containerized services:

- **Core Engine**: Node.js/TypeScript runtime.
- **State Store**: PostgreSQL for lifecycle tracking.
- **Cache**: Redis for loop state management.

## Docker Compose Definition

```yaml
version: '3.8'
services:
  factory-engine:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - cache

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: startup_factory
      POSTGRES_PASSWORD: password

  cache:
    image: redis:alpine
```

## Provisioning Flow

1. `git clone`
2. `npm install`
3. `docker-compose up -d`
