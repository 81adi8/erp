# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- TypeScript 5.9.3 - Server and client codebase

**Secondary:**
- JavaScript (node_modules) - Dependencies only

## Runtime

**Environment:**
- Node.js 18.18.0+ (minimum), 24.10.x supported

**Package Manager:**
- pnpm 8.15.4 (client monorepo)
- npm (server)

## Frameworks

**Server:**
- Express 5.2.1 - REST API framework
- Sequelize 6.37.7 with sequelize-typescript 2.1.6 - ORM for PostgreSQL

**Client:**
- React 19.2.0 - UI framework
- React Router DOM 7.10.1 - Routing
- Redux Toolkit 2.11.0 + Redux 5.0.1 - State management
- Vite 7.2.4 - Build tool

**Testing:**
- Jest 30.2.0 - Server testing
- ts-jest 29.4.6 - TypeScript Jest transformer
- Supertest 7.2.2 - HTTP integration testing

**CSS:**
- Tailwind CSS 4.1.17 - Styling
- Tailwind Vite plugin 4.1.17

## Key Dependencies

**Server Core:**
- `express` 5.2.1 - Web framework
- `sequelize` 6.37.7 - Database ORM
- `ioredis` 5.8.2 - Redis client
- `bull` 4.16.5 - Background job queue
- `jsonwebtoken` 9.0.3 - JWT authentication
- `zod` 4.2.1 - Schema validation

**Authentication & Security:**
- `@keycloak/keycloak-admin-client` 26.4.7 - Keycloak integration
- `bcrypt` 6.0.0 - Password hashing
- `jwks-rsa` 3.2.0 - JWT key management
- `otplib` 12.0.1 - TOTP/MFA support
- `helmet` 8.1.0 - Security headers
- `cors` 2.8.5 - Cross-origin config
- `express-rate-limit` 8.2.1 - Rate limiting

**Data & Files:**
- `pg` 8.16.3 - PostgreSQL driver
- `exceljs` 4.4.0 - Excel export
- `pdfkit` 0.17.2 - PDF generation
- `qrcode` 1.5.4 - QR code generation

**Client Core:**
- `react` 19.2.0 - UI library
- `react-hook-form` 7.69.0 - Form handling
- `@hookform/resolvers` 5.2.2 - Form validation
- `framer-motion` 12.23.26 - Animations
- `lucide-react` 0.561.0 - Icons
- `zod` 4.3.6 - Client validation
- `keycloak-js` 26.2.2 - Keycloak adapter

## Configuration

**Environment:**
- `.env` file required for both server and client apps
- `env.validation.ts` enforces required variables
- Validation mode: warn (dev) or strict (prod)

**Key Environment Variables:**
```
NODE_ENV, PORT
DATABASE_URL, DB_SSL
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID
CORS_ORIGIN, ROOT_DOMAIN
```

**Build:**
- Server: TypeScript compilation with `tsc`
- Client: Vite build with pnpm workspaces

## Platform Requirements

**Development:**
- Node.js 18.18.0+
- PostgreSQL database
- Redis server
- Keycloak instance

**Production:**
- Node.js runtime (PM2 or similar)
- PostgreSQL with SSL
- Redis (production-grade)
- Keycloak for authentication

---

*Stack analysis: 2026-02-24*
