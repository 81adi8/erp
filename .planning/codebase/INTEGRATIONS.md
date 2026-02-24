# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**Authentication & Identity:**
- Keycloak 26.x - Identity and Access Management
  - Implementation: `@keycloak/keycloak-admin-client` SDK
  - Used for: User authentication, role management, OIDC token verification
  - Features: MFA support via TOTP, realm-based multi-tenancy
  - Config: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`

**Background Jobs:**
- Bull 4.16.5 with Redis backend
  - Queues: ATTENDANCE, REPORTS, NOTIFICATIONS, SYSTEM
  - Implementation: Redis-based job queue with persistent storage
  - Located: `server/src/core/queue/QueueManager.ts`

## Data Storage

**Databases:**
- PostgreSQL
  - ORM: Sequelize with sequelize-typescript
  - Connection: `DATABASE_URL` env var
  - SSL: Configurable via `DB_SSL` env var
  - Multi-tenancy: Schema-per-tenant pattern (`tenant_{id}` schemas)
  - Connection pool: max:20, min:5, acquire:60s, idle:10s

**File Storage:**
- Local filesystem (for development)
- AWS S3 integration available via AWS SDK (optional)
  - SDK: `@aws-sdk/client-secrets-manager` 3.992.0 (optional dependency)

**Caching:**
- Redis (ioredis 5.8.2)
  - Connection: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
  - TLS support: Configurable via `REDIS_TLS`
  - Used for: RBAC cache, session store, rate limiting, telemetry buffer
  - Mock available for dev: `ALLOW_REDIS_MOCK=true`

## Authentication & Identity

**Primary Auth Provider:**
- Keycloak OIDC
  - Token verification via JWKS
  - Role mapping from Keycloak realm roles to application roles
  - Middleware: `keycloakOidcMiddleware` in `server/src/core/middleware/keycloak.middleware.ts`

**Session Management:**
- JWT tokens (access + refresh)
  - Access token expiry: 15 minutes (configurable)
  - Refresh token expiry: 7 days (configurable)
  - Session revocation stored in Redis

**Internal API Security:**
- `INTERNAL_API_KEY` header for internal service calls
- IP allowlist: `INTERNAL_IP_ALLOWLIST`

## Monitoring & Observability

**Health Checks:**
- Built-in `/health/ready` endpoint
- Checks: PostgreSQL connection, Redis connectivity
- Dashboard: GoLive dashboard at `/admin/golive-dashboard`

**Logs:**
- Custom logger in `server/src/core/utils/logger.ts`
- Structured logging with context

**Queue Monitoring:**
- Queue stats available via API
- Metrics: queue lag, DLQ count, active jobs

## CI/CD & Deployment

**Hosting:**
- Vercel (client apps: school, super_admin, landing)
- Server deployment: Self-hosted (PM2/Node)

**Client Apps:**
- `client/apps/school` - School portal
- `client/apps/super_admin` - Super admin panel
- `client/apps/landing` - Marketing site

## Environment Configuration

**Required env vars (server):**
```
NODE_ENV=development|production|staging
PORT=3000
DATABASE_URL=postgres://...
REDIS_HOST=<host>
REDIS_PORT=6379
REDIS_PASSWORD=<password>
JWT_ACCESS_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
KEYCLOAK_URL=<url>
KEYCLOAK_REALM=<realm>
KEYCLOAK_CLIENT_ID=<client-id>
KEYCLOAK_ADMIN_CLIENT_ID=<admin-client>
KEYCLOAK_ADMIN_USERNAME=<admin-user>
KEYCLOAK_ADMIN_PASSWORD=<admin-pass>
CORS_ORIGIN=<allowed-origins>
ROOT_DOMAIN=<domain>
CLIENT_URL=<client-url>
SERVER_URL=<server-url>
```

**Client env vars:**
- VITE_API_URL - Backend API endpoint
- VITE_KEYCLOAK_URL - Keycloak URL
- VITE_KEYCLOAK_REALM - Keycloak realm

**Secrets location:**
- Server: `.env` file or environment variables
- Keycloak: External Keycloak server

## Webhooks & Callbacks

**Incoming:**
- None detected (authentication handled via OIDC tokens)

**Outgoing:**
- Keycloak OIDC callbacks (token refresh, logout)

---

*Integration audit: 2026-02-24*
