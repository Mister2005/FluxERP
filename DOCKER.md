# FluxERP Docker Deployment Guide

This guide covers deploying FluxERP using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available

## Quick Start (Development)

1. **Clone the repository and navigate to it:**
   ```bash
   git clone https://github.com/your-repo/fluxerp.git
   cd fluxerp
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

5. **Seed the database (optional):**
   ```bash
   docker-compose --profile seed up seed
   ```

6. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - API Documentation: http://localhost:5001/api-docs

## Services

| Service    | Port | Description                |
|------------|------|----------------------------|
| frontend   | 3000 | Next.js web application    |
| backend    | 5001 | Express.js REST API        |
| postgres   | 5432 | PostgreSQL database        |
| redis      | 6379 | Redis cache                |

## Common Commands

### Start services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View logs
docker-compose logs -f backend

# Follow all logs
docker-compose logs -f
```

### Stop services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v
```

### Database operations
```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec backend npx prisma studio

# Reset database
docker-compose exec backend npx prisma migrate reset
```

### Rebuild images
```bash
# Rebuild all images
docker-compose build

# Rebuild specific image
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache
```

## Production Deployment

### 1. Prepare environment

Create a production `.env` file:

```bash
# .env.production
POSTGRES_USER=fluxerp_user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=fluxerp_prod

JWT_SECRET=<generate-with-openssl-rand-base64-64>
GEMINI_API_KEY=<your-api-key>

NODE_ENV=production
DOMAIN=fluxerp.example.com
ACME_EMAIL=admin@example.com

# Generate with: htpasswd -nB admin
TRAEFIK_USERS=admin:$apr1$...
```

### 2. Deploy with production config

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Run initial setup

```bash
# Run migrations
docker-compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile setup up migrate

# Verify services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### 4. Access production

- Frontend: https://fluxerp.example.com
- API: https://api.fluxerp.example.com
- Traefik Dashboard: https://traefik.fluxerp.example.com

## Health Checks

All services include health checks. Monitor status with:

```bash
docker-compose ps
```

Manually check health endpoints:

```bash
# Backend health
curl http://localhost:5001/health

# Database connectivity (via backend)
curl http://localhost:5001/health | jq
```

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker-compose logs backend
   ```

2. Verify environment variables:
   ```bash
   docker-compose config
   ```

3. Ensure ports aren't in use:
   ```bash
   netstat -tlnp | grep -E '3000|5001|5432|6379'
   ```

### Database connection issues

1. Check if PostgreSQL is healthy:
   ```bash
   docker-compose exec postgres pg_isready
   ```

2. Verify DATABASE_URL format:
   ```
   postgresql://user:password@postgres:5432/database?schema=public
   ```

### Redis connection issues

1. Check if Redis is healthy:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

### Build failures

1. Clear Docker build cache:
   ```bash
   docker-compose build --no-cache
   ```

2. Prune unused images:
   ```bash
   docker system prune -a
   ```

## Backup & Restore

### Backup database

```bash
docker-compose exec postgres pg_dump -U postgres fluxerp > backup.sql
```

### Restore database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres fluxerp
```

### Backup Redis

```bash
docker-compose exec redis redis-cli BGSAVE
docker cp fluxerp-redis:/data/dump.rdb ./redis-backup.rdb
```

## Scaling

For production, consider:

1. **Multiple backend replicas:**
   ```yaml
   # docker-compose.prod.yml
   backend:
     deploy:
       replicas: 3
   ```

2. **External database:**
   Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)

3. **External Redis:**
   Use a managed Redis service (AWS ElastiCache, Redis Cloud, etc.)

4. **Container orchestration:**
   Consider migrating to Kubernetes for larger deployments

## Security Recommendations

1. Never commit `.env` files to version control
2. Use strong, unique passwords for all services
3. Keep Docker images updated
4. Enable HTTPS in production (handled by Traefik)
5. Restrict database access to internal network only
6. Regularly backup your data
7. Monitor container logs for suspicious activity
