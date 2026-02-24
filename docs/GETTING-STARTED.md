# Getting Started

## Prerequisites

- **Node.js** ≥ 18.18.0
- **pnpm** ≥ 8.15.4 (`npm install -g pnpm`)
- **PostgreSQL** 14+ (running locally or remote)
- **Redis** 7+ (running locally or remote)
- **Keycloak** 24+ *(optional — can use JWT-only mode in development)*

---

## 1. Clone the Repository

```bash
git clone <repo-url>
cd school-erp/app
```

---

## 2. Server Setup

### Install dependencies
```bash
cd server
pnpm install
```

### Configure environment
```bash
cp .env.example .env
```

Edit `.env` with your database and service credentials:

```env
# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/school_erp
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:5173

# Domain
ROOT_DOMAIN=localhost
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000

# Keycloak (optional)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=school-erp
KEYCLOAK_CLIENT_ID=school-app
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### Initialize database
```bash
# Run migrations (creates all tables)
pnpm migrate

# Seed global permissions catalog
pnpm seed:global

# Create root super admin user
pnpm seed:admin
```

### Start the server
```bash
# Development (auto-restart on changes)
pnpm dev

# Production
pnpm build
pnpm start
```

Server runs at `http://localhost:3000`.

---

## 3. Client Setup

### Install dependencies
```bash
cd client
pnpm install
```

### Start an app
```bash
# School tenant app (main)
pnpm dev:school       # → http://localhost:5173

# Super admin dashboard
pnpm dev:admin        # → http://localhost:5174

# Landing page
pnpm dev:landing      # → http://localhost:5175
```

---

## 4. Create a Test Tenant

```bash
cd server
pnpm create-tenant
```

Follow the prompts to create an institution. This will:
1. Create a record in the `institutions` table
2. Create a dedicated schema (`tenant_<slug>`)
3. Run all migrations in the new schema
4. Seed default roles and permissions

---

## 5. Production Domain Setup (Subdomain SaaS)

Recommended host mapping:

- `admin.yourdomain.com` â†’ super admin frontend
- `school1.yourdomain.com` â†’ school tenant frontend
- `api.yourdomain.com` â†’ backend API
- `sso.yourdomain.com` â†’ Keycloak

Use production templates:

- `server/.env.production.example`
- `client/apps/school/.env.production.example`
- `client/apps/super_admin/.env.production.example`

Important:

1. `CORS_ORIGIN` must be strict allowlist (no `*` in production).
2. `ROOT_DOMAIN` must be your apex domain (e.g. `yourdomain.com`).
3. `DB_SSL=true` and `REDIS_TLS=true` in production/staging.
4. Tenant realm naming is subdomain-aligned for OIDC isolation.

---

## Available Scripts

### Server (`/server`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with `ts-node` |
| `pnpm live` | Start with `nodemon` (file-watching restart) |
| `pnpm build` | Compile TypeScript → `dist/` |
| `pnpm start` | Run compiled production build |
| `pnpm check` | TypeScript type-check (`tsc --noEmit`) |
| `pnpm migrate` | Run database migrations (alter mode) |
| `pnpm migrate:force` | Run migrations (force — drops + recreates) |
| `pnpm seed:global` | Seed global permissions |
| `pnpm seed:admin` | Create root admin user |
| `pnpm create-tenant` | Create a new tenant institution |

### Client (`/client`)

| Script | Description |
|--------|-------------|
| `pnpm dev:school` | Start school app dev server |
| `pnpm dev:admin` | Start super admin dev server |
| `pnpm dev:landing` | Start landing page dev server |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run linter across all packages |

---

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

**Database connection refused**
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Check that the database `school_erp` exists:
  ```sql
  CREATE DATABASE school_erp;
  ```

**Redis connection failed**
- Ensure Redis is running: `redis-cli ping` → should return `PONG`
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`

**pnpm install fails**
- Ensure correct pnpm version: `pnpm --version` (should be ≥ 8.15.4)
- Clear cache: `pnpm store prune`
