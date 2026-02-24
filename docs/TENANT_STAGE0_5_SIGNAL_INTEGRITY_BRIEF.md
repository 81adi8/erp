# Stage-0.5 Signal Integrity Brief

**Checkpoint:** 2026-02-18 (Stage-0.5)  
**Mode:** Shadow telemetry hardening (classification + attribution only)  
**Enforcement Policy:** **No enforcement changes** (log-only posture maintained)

---

## Executive Summary

Stage-0.5 focuses on **signal integrity**, not remediation. Using the existing Stage-0 telemetry code paths, the drift signals were reclassified by confidence and origin so that migration noise is separated from true integrity anomalies. This produces a stricter attribution model while keeping runtime behavior unchanged.

Outcome: telemetry is now more interpretable for decisioning, but platform-wide enforcement is still not safe.

---

## 1) Recalculated ERI

### 1.1 Scoring Model (unchanged for comparability)

`ERI = 0.30*SignalCoverage + 0.25*AggregationQuality + 0.25*DriftSpecificity + 0.20*ScopeRepresentativeness`

### 1.2 Stage-0.5 Inputs (accuracy-adjusted)

| Dimension                | Score (/100) | Stage-0.5 Adjustment Basis                                                                                                                                        |
| ------------------------ | -----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signal Coverage          |           89 | Full 7-metric set exists, but one intended write sentinel path is practically unreachable under current shadow scope gating.                                      |
| Aggregation Quality      |           73 | Classification hardening improves interpretation (reason-family grouping, source de-noising), though high-cardinality labels still constrain aggregation quality. |
| Drift Specificity        |           72 | Drift is now split into deterministic vs transitional vs lifecycle classes, reducing attribution ambiguity.                                                       |
| Scope Representativeness |           58 | Canary-heavy route coverage remains the main confidence limiter.                                                                                                  |

### 1.3 Result

**Recalculated ERI (Stage-0.5): `75 / 100`**  
**Prior ERI (Stage-0): `73 / 100`**  
**Delta:** `+2` (better interpretability; not broader enforcement readiness)

**Band:** **AMBER+ — Signal-Accurate, Enforcement-Hold**

---

## 2) Drift Origin Map

> Attribution weights below are **signal-pressure weights** (classification-derived), not raw event-volume percentages.

| Drift Origin Domain                   | Attribution Weight | Primary Signals                                                                | Confidence  | Notes                                                                           |
| ------------------------------------- | -----------------: | ------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| Identity namespace divergence         |                44% | `tenant_mismatch_shadow_rate`, `legacy_header_usage`, `jwt_legacy_claim_usage` | Medium-High | Mixed UUID/schema/slug semantics create transitional mismatch inflation.        |
| Write-path sentinel surface           |                24% | `repo_unscoped_write_detected`                                                 | Medium      | High sensitivity sentinel; repository-level emits dominate under current scope. |
| Async context lifecycle variance      |                17% | `als_context_drift`                                                            | Medium      | Fires on expected context re-entry/bootstrap paths as well as true drift.       |
| Cache alias collision conditions      |                 8% | `tenant_cache_key_collisions`                                                  | High        | Narrow predicate; low expected volume, high integrity value.                    |
| Telemetry exception/cardinality noise |                 7% | `als_context_drift` (failure labels), mismatch raw IDs                         | Medium-Low  | Free-form message/raw identifiers reduce rollup stability.                      |

### 2.1 Origin-to-Code Evidence Anchors

- **Identity comparison engine:** `server/src/core/tenant/tenant-identity.ts` (`compareTenantIdentityShadow`)
- **Shadow emit orchestration + canary scoping:** `server/src/core/middleware/tenant-context.middleware.ts`
- **Repository write sentinel emit path:** `server/src/modules/shared/repositories/user.repository.ts`
- **Tenant canonical source assembly:** `server/src/modules/tenant/middlewares/tenant.middleware.ts`

---

## 3) Enforcement Safety Prediction

| Candidate Enforcement Shape                                  |       Predicted Safety | Why                                                                                                               |
| ------------------------------------------------------------ | ---------------------: | ----------------------------------------------------------------------------------------------------------------- |
| Platform-wide hard enforcement now                           |         **Low (0.34)** | Canary-weighted representativeness + migration-era identity noise would likely produce avoidable false positives. |
| Canary-route hard enforcement on all mismatches              |  **Low-Medium (0.49)** | Mismatch families include transitional namespace drift and should not be globally blocking yet.                   |
| Deterministic-class micro-enforcement only (collision-class) | **Medium-High (0.78)** | Narrow predicate, high attribution confidence, low migration ambiguity.                                           |
| Continue shadow-only with integrity scoring                  |        **High (0.92)** | Preserves safety while improving confidence model.                                                                |

### Safety Decision

✅ **Keep non-enforcing posture.**  
⚠️ Broad or generalized enforcement is **not recommended** at Stage-0.5.

---

## 4) First Micro-Enforcement Entry Surface (Definition Only, No Activation)

**Surface ID:** `S0.5-ME-01`  
**Location:** `server/src/core/middleware/tenant-context.middleware.ts`  
**Entry Predicate:** existing `cacheCollisionDetected` condition (currently log-only)  
**Route Scope:** canary auth surfaces (`/api/v1/tenant/auth/*`, `/api/v2/api/school/auth/*`)  
**Signal Basis:** `tenant_cache_key_collisions`

### Why this is first

1. **Highest attribution confidence** among current drift classes.
2. **Minimal migration ambiguity** compared with namespace mismatch families.
3. **Low blast radius** due canary-limited route scope.
4. **Clear integrity semantics** (conflicting legacy header identity vs canonical tenant).

### Guardrail

This brief defines the first micro-enforcement surface **for future staging only**.  
Current runtime remains **strictly shadow/log-only**.

---

## Stage-0.5 Conclusion

- Signal interpretation quality improved through classification + origin attribution hardening.
- ERI improved to **75/100**, but readiness is still constrained by representativeness and migration-era noise.
- The safest future entry point is a **single deterministic collision-class surface**, not broad policy enforcement.
