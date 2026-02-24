# Codebase Concerns

**Analysis Date:** 2026-02-24

## Tech Debt

**Incomplete SSO/OIDC Implementation:**
- Issue: SSO identity provider has multiple incomplete TODO comments for OIDC token exchange, verification, and logout
- Files: `server/src/core/auth/providers/sso.identity.provider.ts` (lines 39, 52, 61, 66)
- Impact: SSO authentication flow is incomplete; users cannot fully authenticate via external SSO providers
- Fix approach: Implement full OIDC token exchange flow with token introspection and back-channel logout support

**Vault Secrets Management Not Implemented:**
- Issue: TODO comment indicates Vault KV v2 fetch is not implemented
- Files: `server/src/core/secrets/secret.provider.ts` (line 126)
- Impact: Secrets are currently managed via environment variables only; no integration with HashiCorp Vault
- Fix approach: Implement Vault KV v2 client to fetch secrets dynamically at runtime

**University Module Deferred:**
- Issue: University module is explicitly deferred and not in active scope
- Files: `server/src/modules/tenant/routes/index.ts` (line 40)
- Impact: University-level functionality is not available
- Fix approach: Implement University module when scope expands

**Missing RBAC Permission Catalog:**
- Issue: Some permissions need to be added to RBAC permission catalog before full migration
- Files: `server/src/core/rbac/permission-map.ts` (line 118)
- Impact: Incomplete RBAC coverage for certain operations
- Fix approach: Add missing permissions to the RBAC permission catalog

**Queue Routes Disabled:**
- Issue: Queue routes are disabled pending proper auth hardening
- Files: `server/src/app.ts` (line 285)
- Impact: Queue management endpoints are not accessible
- Fix approach: Enable queue routes after auth hardening is complete

**HACK Test Data in Production Tests:**
- Issue: Test file contains hardcoded "HACK001" admission number
- Files: `server/src/__tests__/tenant/tenant-isolation.test.ts` (line 155)
- Impact: Test data patterns could leak into production if not properly isolated
- Fix approach: Use dynamic test data generation instead of hardcoded values

## Known Bugs

**Environment Configuration Gap:**
- Issue: `server/src/config/db.ts` is essentially empty (only exports empty object)
- Files: `server/src/config/db.ts`
- Impact: Database configuration may not be properly centralized; relies on other config files
- Fix approach: Consolidate database configuration or remove the file if redundant

**Multiple Empty Return Patterns:**
- Issue: 97 instances of `return null`, `return []`, or `return {}` scattered throughout codebase
- Files: Multiple files in `server/src/modules/` and `server/src/core/`
- Impact: Inconsistent error handling; some functions return null/empty on errors instead of throwing
- Fix approach: Standardize error handling patterns; throw errors instead of returning null/empty in failure cases

**Missing Error Propagation in Middleware:**
- Issue: Several middleware functions return null without proper error propagation
- Files: `server/src/core/middleware/resolveTenantContext.middleware.ts` (multiple lines)
- Impact: Silent failures can lead to unexpected behavior when tenant context cannot be resolved
- Fix approach: Return proper error responses instead of null in middleware

## Security Considerations

**CORS Wildcard Risk:**
- Issue: CORS allows wildcard (`*`) in non-production environments
- Files: `server/src/app.ts` (line 168)
- Current mitigation: Explicitly forbidden in staging/production
- Recommendations: Continue enforcing strict CORS in production; consider adding runtime CORS validation

**Database SSL Rejection Unauthorized:**
- Issue: `rejectUnauthorized: false` in database SSL configuration
- Files: `server/src/database/sequelize.ts` (line 38)
- Current mitigation: SSL is optional and controlled via environment
- Recommendations: Enable proper SSL certificate validation in production; use trusted certificates

**Rate Limiting Per-User Bypass:**
- Issue: Rate limiter uses optional userId from request, which could be manipulated
- Files: `server/src/app.ts` (lines 87-93)
- Current mitigation: Falls back to IP if userId not available
- Recommendations: Ensure rate limiting cannot be bypassed by spoofing user headers

**Incomplete MFA Implementation:**
- Issue: MFA service exists but may have incomplete flows
- Files: `server/src/core/auth/mfa.service.ts` (line 248 mentions format)
- Recommendations: Verify complete MFA enrollment and verification flows

**Secret Management:**
- Issue: Uses optional AWS Secrets Manager dependency
- Files: `server/package.json` (line 93)
- Recommendations: Implement proper secrets management for production

## Performance Bottlenecks

**Large Configuration Files:**
- Issue: `env.validation.ts` is 434 lines - likely contains extensive validation logic
- Files: `server/src/config/env.validation.ts`
- Cause: Heavy environment validation on startup
- Improvement path: Consider lazy validation or caching validation results

**Sequelize Pool Configuration:**
- Issue: Database pool max is 20 connections per instance
- Files: `server/src/database/sequelize.ts` (line 16)
- Current capacity: 20 concurrent DB connections per server instance
- Limit: Will bottleneck under high concurrent load
- Scaling path: Implement connection pooling at application level or use PgBouncer

**Missing Query Optimization:**
- Issue: Multiple N+1 query patterns likely exist in services
- Files: `server/src/modules/school/student/services/student.service.ts`, `server/src/modules/school/fees/services/fee.service.ts`
- Cause: No evident use of eager loading or query optimization
- Improvement path: Add Sequelize hooks for eager loading relationships; implement query result caching

**Cache Key Pattern Issues:**
- Issue: Cache keys use dynamic patterns that may not be consistently applied
- Files: `server/src/core/cache/cache.keys.ts`
- Impact: Cache misses due to key mismatches
- Improvement path: Centralize cache key generation

## Fragile Areas

**Tenant Context Resolution:**
- Files: `server/src/core/middleware/resolveTenantContext.middleware.ts`
- Why fragile: Complex multi-step tenant resolution with multiple fallbacks; any step failure can cause silent issues
- Safe modification: Add comprehensive logging at each resolution step
- Test coverage: Should add integration tests for each tenant resolution path

**Dynamic Schema Queries:**
- Files: `server/src/modules/school/student/repositories/student.repository.ts`, `server/src/modules/school/fees/repositories/fee.repository.ts`
- Why fragile: Heavy use of `Model.schema(schemaName)` pattern; schema name injection risks
- Safe modification: Validate schema names before use; add schema isolation tests
- Test coverage: Tenant isolation tests exist but may not cover all edge cases

**Event System Initialization:**
- Files: `server/src/core/events/event.controller.ts`, `server/src/app.ts`
- Why fragile: Event system initialization is async and must complete before routes handle traffic
- Safe modification: Ensure initialization is complete before accepting requests; add health check validation
- Test coverage: Should add tests for partial initialization scenarios

**Sequelize Hooks for Audit:**
- Files: `server/src/core/audit/data-change-audit.hooks.ts`
- Why fragile: Global hooks run on every model operation; performance impact and potential for infinite loops
- Safe modification: Carefully audit hook logic; add recursion guards
- Test coverage: Should test audit hooks in isolation

## Scaling Limits

**Database Connection Pool:**
- Current capacity: 20 max connections per instance
- Limit: Single instance can handle ~100-200 concurrent users before connection exhaustion
- Scaling path: Implement read replicas; add PgBouncer for connection pooling; consider database sharding by tenant

**Redis Cache:**
- Current: Single Redis instance
- Limit: Memory-bound; no clustering configured
- Scaling path: Enable Redis Cluster for horizontal scaling

**Express Rate Limiter:**
- Current: 100 requests/minute per IP
- Limit: May be too restrictive for legitimate bulk operations
- Scaling path: Implement tiered rate limiting by endpoint sensitivity

**Memory Usage:**
- Issue: Large model loading at startup
- Files: `server/src/database/model-loader.ts`
- Current: Loads all models into memory
- Scaling path: Implement lazy model loading

## Dependencies at Risk

**Sequelize and Sequelize-Typescript:**
- Risk: Using older patterns with sequelize-typescript wrapper
- Impact: May face compatibility issues with newer Node.js versions
- Migration plan: Consider migrating to Prisma or staying with Sequelize but removing wrapper

**Express 5.x:**
- Risk: Express 5 is relatively new (version 5.2.1 in use)
- Impact: Potential bugs or breaking changes
- Migration plan: Monitor Express 5 stability; test thoroughly before updates

**Keycloak Admin Client:**
- Risk: Version 26.4.7 is recent
- Impact: API changes could break tenant provisioning
- Migration plan: Pin version; test thoroughly on Keycloak updates

**Bull Queue:**
- Risk: Version 4.16.5 is stable but has not been updated recently
- Impact: May have unpatched vulnerabilities
- Migration plan: Consider migrating to BullMQ (modern replacement)

## Missing Critical Features

**Comprehensive API Documentation:**
- Problem: No OpenAPI/Swagger documentation
- Blocks: Third-party integrations; API consumer onboarding

**Automated Database Migrations:**
- Problem: Migrations exist but may not cover all schema changes
- Blocks: Safe deployments; schema version control

**Comprehensive Integration Tests:**
- Problem: Unit tests exist but limited end-to-end coverage
- Blocks: Confidence in deployment; regression detection

**Health Check Depth:**
- Problem: Basic health checks don't verify all dependencies
- Blocks: Production monitoring; deployment validation

## Test Coverage Gaps

**Error Handling Paths:**
- What's not tested: Many error handlers return null instead of throwing; these paths not tested
- Files: `server/src/core/cache/cache.service.ts`, `server/src/core/rbac/rbac.cache.ts`
- Risk: Silent failures in error conditions
- Priority: High

**Tenant Isolation:**
- What's not tested: Cross-tenant data access prevention under various attack vectors
- Files: `server/src/core/resilience/tenant-isolation.guard.ts`
- Risk: Data leakage between tenants
- Priority: High

**Authentication Flow:**
- What's not tested: Full OAuth2/OIDC flow with Keycloak
- Files: `server/src/core/middleware/keycloak.middleware.ts`
- Risk: Authentication bypasses
- Priority: High

**Concurrent Operations:**
- What's not tested: Race conditions in concurrent tenant operations
- Files: `server/src/modules/tenant/services/tenant.service.ts`
- Risk: Data corruption under load
- Priority: Medium

---

*Concerns audit: 2026-02-24*
