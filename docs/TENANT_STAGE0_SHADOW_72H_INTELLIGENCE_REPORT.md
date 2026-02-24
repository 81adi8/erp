# TENANT STAGE 0 SHADOW RUN — +72H INTELLIGENCE REPORT

**Report Time:** 2026-02-18 (+72h window checkpoint)  
**Run Mode:** Stage 0 (Shadow / Log-Only)  
**Scope:** Tenant identity drift, context drift, write-path drift, cache collision risk  
**Data Policy:** Synthesized operational intelligence only (no raw logs)

---

## Executive Snapshot

Stage 0 shadow execution remains active and non-blocking. Telemetry coverage is broad enough to characterize drift classes, but aggregation quality is currently constrained by mixed identifier semantics (UUID vs schema vs slug), high-cardinality labels on selected signals, and canary-weighted route coverage.

At +72h, the intelligence posture is **operationally useful but not enforcement-grade at full surface area**. Primary risk concentration is in **identity-source divergence** and **write-path sentinel noisiness**, not in hard runtime blocking behavior.

---

## 1) Drift Metrics Summary

### 1.1 Signal Inventory & Coverage

| Metric                         | Class     | Emission Intent                                   | Relative Drift Pressure |
| ------------------------------ | --------- | ------------------------------------------------- | ----------------------- |
| `tenant_mismatch_shadow_rate`  | Counter   | Canonical tenant identity mismatch detection      | High                    |
| `legacy_header_usage`          | Counter   | Legacy header migration tracking                  | Medium                  |
| `jwt_legacy_claim_usage`       | Counter   | Legacy JWT claim migration tracking               | Medium                  |
| `als_context_drift`            | Counter   | AsyncLocalStorage/request context drift detection | Medium-High             |
| `repo_unscoped_write_detected` | Counter   | Write-path scope anomaly sentinel (log-only)      | High                    |
| `tenant_resolution_latency`    | Histogram | Tenant resolution timing quality                  | Medium                  |
| `tenant_cache_key_collisions`  | Counter   | Slug/id cache alias collision sentinel            | Low-Medium              |

### 1.2 +72h Synthesized Telemetry Quality KPIs

- **Metric Coverage:** `7 / 7` key Stage-0 tenant shadow metrics instrumented.
- **Emit Surface:** `11` explicit emit points identified (middleware + repository).
- **Context Dimensions:** Route/method/timestamp consistently available.
- **Taxonomy Depth:** `4` explicit mismatch reason signatures for identity drift triage.
- **Scope Shape:** Canary-first (`/api/v1/tenant/auth`, `/api/v2/api/school/auth`) with optional read-route expansion flag.

### 1.3 Drift Signal Interpretation (Synthesized)

- **Identity drift exposure:** Elevated (multi-source tenant identity inputs remain active during migration).
- **Context drift exposure:** Moderate to elevated (ALS rehydration path intentionally defensive).
- **Write-path drift exposure:** Elevated by design (sentinel tuned for sensitivity in shadow mode).
- **Cache-collision exposure:** Low to moderate (narrow predicate, high impact if triggered).

---

## 2) Categorized Root Causes

| Category                           | Root Cause Pattern                                                                             | Affected Signals                                                               | Operational Impact                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Identity Namespace Divergence      | UUID/schema/slug compared across legacy + canonical channels                                   | `tenant_mismatch_shadow_rate`, `legacy_header_usage`, `jwt_legacy_claim_usage` | Drift counters inflate during transition, requires semantic normalization in aggregation |
| Transitional Compatibility Debt    | Legacy headers and legacy JWT claims still accepted for backward compatibility                 | `legacy_header_usage`, `jwt_legacy_claim_usage`                                | Useful migration visibility but can be misread as policy violations                      |
| Async Context Boundary Variance    | Request context can be absent/updated across middleware boundaries                             | `als_context_drift`                                                            | Drift spikes may represent lifecycle re-entry, not production faults                     |
| Conservative Write Sentinel Design | Log-only write detector intentionally broad outside canary routes                              | `repo_unscoped_write_detected`                                                 | High sensitivity, lower precision without aggregation-side suppression                   |
| Cache Key Alias Conditions         | Legacy header institution id conflicts with canonical tenant + slug mapping                    | `tenant_cache_key_collisions`                                                  | Rare but high-severity collision indicator                                               |
| Scope Representativeness Gaps      | Canary-first coverage + known route reachability issues reduce full-surface representativeness | All summary rates                                                              | Trend confidence reduced for enforcement decisions at platform-wide scope                |

---

## 3) False-Positive Analysis

### 3.1 Signal-Level False-Positive Risk

| Signal                         | FP Risk                                    | Why                                                                                      |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `repo_unscoped_write_detected` | High                                       | Triggered both at middleware-level sentinel and repository-level guard in migration mode |
| `als_context_drift`            | Medium-High                                | Can fire during expected context bootstrap/rehydration, not only failure paths           |
| `tenant_mismatch_shadow_rate`  | Medium                                     | Namespace mismatch (slug/schema/UUID) may be transitional, not strict drift defect       |
| `legacy_header_usage`          | Low (for incidenting), High (for volume)   | Expected during migration; should be trend-only metric                                   |
| `jwt_legacy_claim_usage`       | Low (for incidenting), Medium (for volume) | Expected while mixed token issuers/claims coexist                                        |
| `tenant_cache_key_collisions`  | Low                                        | Predicate is strict; likely high-signal if observed                                      |
| `tenant_resolution_latency`    | Low                                        | Timing metric; false positives mainly threshold-definition related                       |

### 3.2 Aggregation-Side FP Controls (No Logic Change)

1. **Treat migration counters as non-paging indicators** (`legacy_header_usage`, `jwt_legacy_claim_usage`).
2. **Normalize identity namespaces before incident scoring** (UUID ↔ schema ↔ slug mapping).
3. **Drop high-cardinality labels from group-by dimensions** (`requestId`, free-form error `message`).
4. **Deduplicate write sentinel events per request window** to prevent multi-emit inflation.
5. **Use route-family rollups** (auth / tenant-read / tenant-write) for stable trend lines.

---

## 4) Enforcement Readiness Index (ERI)

### 4.1 Scoring Model

`ERI = 0.30*SignalCoverage + 0.25*AggregationQuality + 0.25*DriftSpecificity + 0.20*ScopeRepresentativeness`

| Dimension                | Score (/100) | Basis                                                                    |
| ------------------------ | -----------: | ------------------------------------------------------------------------ |
| Signal Coverage          |           92 | Full Stage-0 metric set present, multi-point emission coverage           |
| Aggregation Quality      |           70 | Structured payloads available; cardinality discipline still needed       |
| Drift Specificity        |           64 | Several high-sensitivity signals produce migration-phase noise           |
| Scope Representativeness |           58 | Canary-weighted scope and known routing blind spots limit generalization |

### 4.2 Result

**Enforcement Readiness Index (ERI): `73 / 100`**  
**Band:** **AMBER — Controlled-Ready (Telemetry), Not Yet Full Enforcement-Ready**

Interpretation:

- Ready to continue/expand Stage-0 shadow intelligence collection and aggregation hardening.
- Not yet ready for broad strict enforcement decisions without FP normalization and broader representative coverage.

---

## Stage-0 Decision at +72h

✅ **Continue Stage 0 shadow run**  
✅ **Prioritize telemetry quality and aggregation normalization**  
⚠️ **Defer full-surface enforcement gating until FP controls + representativeness improve**

This report intentionally excludes raw logs and provides synthesized operational intelligence only.
