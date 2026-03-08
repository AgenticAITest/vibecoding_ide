# VibeCoder IDE — Deployment Guide

## Prerequisites

| Component | Version | Purpose |
|-----------|---------|---------|
| **Docker** | 20.10+ | Container runtime |
| **Docker Compose** | v2+ | Multi-container orchestration |
| **Git** | 2.30+ | Clone the repository |
| A **Linux server** (Ubuntu 22.04+ recommended) | — | Production host |
| A **domain name** (optional but recommended) | — | HTTPS via Caddy auto-TLS |

No Node.js installation is needed on the server — everything runs inside Docker.

---

## Tech Stack (what gets deployed)

| Layer | Technology | Container |
|-------|-----------|-----------|
| **Reverse Proxy / TLS** | Caddy 2 (Alpine) | `caddy` |
| **Database** | PostgreSQL 16 (Alpine) | `postgres` |
| **Backend** | Node.js 20 + Express 5 + WebSocket | `vibecoder` |
| **Frontend** | React 19 (static files served by Express in production) | bundled into `vibecoder` |
| **Terminal** | node-pty (native PTY sessions) | inside `vibecoder` |
| **AI Chat** | Claude Agent SDK (requires Claude Max subscription on host) | inside `vibecoder` |
| **Git** | simple-git (uses system git in container) | inside `vibecoder` |

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_ORG/vibecoding_ide.git
cd vibecoding_ide
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with production values:

```env
# PostgreSQL password (used by both postgres and vibecoder containers)
POSTGRES_PASSWORD=your-strong-db-password

# JWT secret for auth tokens — use a random 32+ character string
JWT_SECRET=your-random-jwt-secret-at-least-32-chars

# Initial admin account (created on first boot)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# Domain for HTTPS (Caddy auto-provisions Let's Encrypt certs)
# Use "localhost" for local/testing (self-signed)
VIBECODER_DOMAIN=ide.yourdomain.com
```

**Generate a random JWT secret:**
```bash
openssl rand -base64 32
```

### 3. DNS setup (if using a domain)

Point your domain's A record to your server's public IP:
```
ide.yourdomain.com  →  A  →  YOUR_SERVER_IP
```

Caddy will automatically obtain and renew Let's Encrypt TLS certificates once DNS resolves.

### 4. Build and start

```bash
docker compose up -d --build
```

This will:
1. Build the `vibecoder` image (compiles TypeScript, bundles frontend)
2. Start PostgreSQL and wait for it to be ready
3. Start the VibeCoder backend (initializes DB tables, seeds admin user)
4. Start Caddy (provisions TLS certificate if using a real domain)

### 5. Verify

```bash
# Check all containers are running
docker compose ps

# Check logs
docker compose logs -f vibecoder

# Test health endpoint
curl https://ide.yourdomain.com/api/health
# → {"status":"ok"}
```

### 6. Log in

Open `https://ide.yourdomain.com` in your browser and log in with the admin credentials you configured in `.env`.

---

## Seeding Admin Users

The admin account is automatically created on first boot using the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

To manually create or reset admin users after deployment:

```bash
# From the project root on the server
docker compose exec vibecoder node /app/scripts/seed-admin.js
```

Or with custom credentials:

```bash
docker compose exec vibecoder sh -c '\
  ADMIN_USERNAME=newadmin \
  ADMIN_PASSWORD=secure-password \
  DATABASE_URL=postgresql://vibecoder:${POSTGRES_PASSWORD}@postgres:5432/vibecoder \
  node /app/scripts/seed-admin.js'
```

You can also create users from the **Admin Panel** inside the IDE (accessible to admin users via the person icon in the tab bar).

---

## Architecture Overview

```
Internet
  │
  ▼
┌─────────────────────┐
│  Caddy (port 80/443)│  ← auto-TLS via Let's Encrypt
│  Reverse Proxy       │
└──────────┬──────────┘
           │ (internal network)
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  VibeCoder (3001)   │────▶│  PostgreSQL (5432)│
│  Express + WS       │     │  User data        │
│  Static frontend    │     └──────────────────┘
│  PTY terminals      │
│  AI chat (Claude)   │
└─────────────────────┘
           │
           ▼
     /projects volume
     (user project files)
```

---

## Docker Compose Services

### `caddy` — Reverse Proxy
- Image: `caddy:2-alpine`
- Ports: `80` (HTTP → redirect to HTTPS), `443` (HTTPS)
- Volumes: `Caddyfile` config, persistent cert storage (`caddy-data`, `caddy-config`)
- Automatically provisions Let's Encrypt TLS certificates for the configured domain

### `postgres` — Database
- Image: `postgres:16-alpine`
- Internal only (no host port exposed)
- Volume: `pgdata` for persistent storage
- Stores: user accounts, hashed passwords, application settings

### `vibecoder` — Application Server
- Built from `Dockerfile` (multi-stage: Node 20 Alpine)
- Internal only (port 3001, accessed via Caddy)
- Volume: `user-projects` for persistent project files
- Serves both the API and the built frontend static files

---

## Persistent Volumes

| Volume | Purpose | Backup priority |
|--------|---------|-----------------|
| `pgdata` | PostgreSQL data (users, settings) | High |
| `user-projects` | All user project files | High |
| `caddy-data` | TLS certificates | Low (auto-regenerated) |
| `caddy-config` | Caddy runtime config | Low (auto-regenerated) |

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `VIBECODER_DOMAIN` | `localhost` | Domain for Caddy TLS. Use a real domain for Let's Encrypt. |
| `POSTGRES_PASSWORD` | `vibecoder_dev` | PostgreSQL password. **Change in production.** |
| `DATABASE_URL` | (auto-constructed) | PostgreSQL connection string (set in docker-compose.yml) |
| `JWT_SECRET` | `change-me-in-production` | Secret for signing JWT auth tokens. **Change in production.** |
| `ADMIN_USERNAME` | `admin` | Initial admin account username |
| `ADMIN_PASSWORD` | `admin123` | Initial admin account password. **Change in production.** |
| `NODE_ENV` | `production` | Enables static frontend serving from Express |
| `PORT` | `3001` | Backend listen port (inside container) |

---

## Claude AI Setup

The AI chat feature uses the **Claude Agent SDK**, which requires a **Claude Max subscription** on the host machine. The SDK spawns a Claude CLI subprocess.

To enable AI chat in production:

1. Install the Claude CLI on the host (or inside the container):
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Authenticate the Claude CLI:
   ```bash
   claude auth login
   ```

3. The SDK config persists in `~/.claude/` — mount this into the container if needed:
   ```yaml
   # Add to docker-compose.yml vibecoder service volumes:
   volumes:
     - user-projects:/projects
     - ~/.claude:/root/.claude:ro
   ```

> **Note:** If you don't need AI chat, the IDE works without it — all other features (editor, terminal, git, file management) function independently.

---

## Updating

```bash
cd vibecoding_ide
git pull
docker compose up -d --build
```

This rebuilds the application image and restarts only changed containers. Database data and project files persist in Docker volumes.

---

## Backups

### Database
```bash
# Dump database
docker compose exec postgres pg_dump -U vibecoder vibecoder > backup-$(date +%Y%m%d).sql

# Restore database
cat backup-20240101.sql | docker compose exec -T postgres psql -U vibecoder vibecoder
```

### Project files
```bash
# Find the volume mount path
docker volume inspect vibecoding_ide_user-projects

# Or copy files out
docker compose cp vibecoder:/projects ./projects-backup
```

---

## Troubleshooting

### Caddy can't get TLS certificate
- Ensure ports 80 and 443 are open in your firewall/security group
- Ensure DNS A record points to the server's public IP
- Check Caddy logs: `docker compose logs caddy`

### Database connection errors
- Check PostgreSQL is running: `docker compose ps postgres`
- Check logs: `docker compose logs postgres`
- Verify `DATABASE_URL` matches `POSTGRES_PASSWORD`

### node-pty build failures
- The Dockerfile installs `python3 make g++` for native compilation
- If the build fails, ensure Docker has sufficient memory (2GB+ recommended)

### WebSocket connection drops
- If behind an additional reverse proxy (e.g., nginx, AWS ALB), ensure WebSocket upgrade is configured
- Caddy handles WebSocket proxying automatically

### Container won't start
```bash
# Check logs
docker compose logs vibecoder

# Shell into the container for debugging
docker compose exec vibecoder sh
```

---

## Firewall / Security Group

Minimum ports to open on the server:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH access |
| 80 | TCP | HTTP (Caddy redirects to HTTPS) |
| 443 | TCP | HTTPS (all traffic) |

All internal communication (Express ↔ PostgreSQL, Caddy ↔ Express) uses Docker's internal network — no host ports needed.

---

## Running Without Docker (Development)

For local development without Docker:

1. **Install prerequisites:**
   - Node.js 20+
   - PostgreSQL 16 (or use the dev compose file)
   - Git

2. **Start PostgreSQL:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Install dependencies and start:**
   ```bash
   cd vibecoder
   npm install
   npm run dev
   ```

4. **Open:** http://localhost:5173

The dev setup uses PostgreSQL on port 5434 (to avoid conflicts with existing instances).
