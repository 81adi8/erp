# Dev and Production Setup + Runtime Verification

**Date:** 2026-02-23  
**Owner:** Agent  
**Scope:** Software runtime setup and smoke verification (server, school app, super admin app, Keycloak local image)

---

## 1) Local Setup (Windows PowerShell)

### 1.1 Install dependencies

```powershell
pnpm --dir server install
pnpm --dir client install
```

### 1.2 Environment files

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/apps/school/.env.example client/apps/school/.env
Copy-Item client/apps/super_admin/.env.example client/apps/super_admin/.env
```

Edit values in these files to match your local PostgreSQL, Redis, and Keycloak endpoints:

- `server/.env`
- `client/apps/school/.env`
- `client/apps/super_admin/.env`

### 1.3 Start backend + frontends in dev

Run in separate terminals:

```powershell
pnpm --dir server dev
```

```powershell
pnpm --dir client dev:school
```

```powershell
pnpm --dir client dev:admin
```

Expected URLs:

- Server health: `http://localhost:3000/health`
- School app: `http://localhost:5173`
- Super admin app: `http://localhost:5174`

---

## 2) Keycloak Docker Image (Local)

### 2.1 Pull image

```powershell
docker pull quay.io/keycloak/keycloak:24.0
```

Optional pre-check (avoid duplicate container/port conflicts):

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### 2.2 Run container

```powershell
docker run --name keycloak-local `
  -p 8080:8080 `
  -e KEYCLOAK_ADMIN=admin `
  -e KEYCLOAK_ADMIN_PASSWORD=admin `
  quay.io/keycloak/keycloak:24.0 start-dev
```

Keycloak URL: `http://localhost:8080`

If `8080` is already used by an existing Keycloak container, do not start a second container on the same port.

Useful commands:

```powershell
docker stop keycloak-local
docker start keycloak-local
docker logs -f keycloak-local
```

---

## 3) Production Artifact Smoke (Local Machine)

### 3.1 Build all artifacts

```powershell
pnpm --dir server build
pnpm --dir client --filter school build
pnpm --dir client --filter super_admin build
```

### 3.2 Run compiled backend (temporary local production smoke)

```powershell
$env:PORT="3300"
pnpm --dir server start
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3300/health
```

### 3.3 Serve built frontends (preview)

Run with explicit ports if both need to run at the same time:

```powershell
pnpm --dir client --filter school exec vite preview --host 127.0.0.1 --port 4173 --strictPort
pnpm --dir client --filter super_admin exec vite preview --host 127.0.0.1 --port 4174 --strictPort
```

Note: both app `preview` scripts default to `4173`, so explicit ports are required for parallel preview sessions.

---

## 4) Verification Results (Executed 2026-02-23)

### Dev mode

- `http://localhost:3000/health` -> `200`
- `http://localhost:5173` -> `200`
- `http://localhost:5174` -> `200`

### Quality checks

- `pnpm --dir server check` -> PASS
- `pnpm --dir client --filter school check` -> PASS
- `pnpm --dir client --filter super_admin check` -> PASS
- `pnpm --dir server test --runInBand` -> PASS (`6/6` suites, `41/41` tests)

### Production artifacts

- `pnpm --dir server build` -> PASS
- `pnpm --dir client --filter school build` -> PASS
- `pnpm --dir client --filter super_admin build` -> PASS
- Compiled backend smoke on port `3300` -> `200` (`/health`)
- School preview smoke -> `200`
- Super admin preview smoke -> `200`

### Observations

- Frontend builds emit chunk size warnings (not build-breaking).
- Test env shows Redis credential fallback warnings and auth-audit test log noise, but suite result is fully passing.
