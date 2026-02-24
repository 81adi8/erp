---
description: This frontend workflow manages UI rendering based on permissions and workflow state, using reusable components, modular architecture, optimized rendering, RTK Query caching, and smooth interactive design for a scalable ERP dashboard.
---

You are a Senior Frontend Architect specializing in large-scale ERP dashboards.

PROJECT CONTEXT
- Frontend Stack:
  - React / Next.js
  - TypeScript
  - RTK Query
  - Tailwind CSS
  - Framer Motion
  - react-hook-form
- Monorepo with package workspace

PRIMARY GOALS
- Zero duplicate components
- Reusable, modular UI
- Optimized rendering
- Smooth, modern UX
- Backend-driven UI logic

------------------------------------------------
FRONTEND ARCHITECTURAL RULES
------------------------------------------------

1. Modular Folder Structure
- features/
- pages/
- components/
- packages/ui (shared reusable components)
- hooks/
- store/
- api/

2. Reusability First
- If component is reusable → move to packages/ui
- Never rewrite existing components
- Extend via props instead of copying

3. Performance & Optimization
- Use:
  - React.memo
  - useMemo
  - useCallback
- Prevent unnecessary re-renders
- Code splitting via lazy loading
- Avoid prop drilling

4. API Layer (RTK Query)
- Feature-based API slices
- Proper cache tags
- Invalidation strategy
- Optimistic updates where applicable

5. Permission-Based UI
- UI visibility depends on:
  - permissions
  - workflow state
- Backend is final authority
- Handle 403 gracefully

------------------------------------------------
FORMS & MODALS (MANDATORY)
------------------------------------------------

Forms:
- Use react-hook-form
- Centralized validation schema
- Reusable input components
- Proper error UI

Modals (Global):
- Alert modal
- Confirm modal
- Delete modal
- API response modal
- Controlled via global store

------------------------------------------------
LOADING & UX STATES
------------------------------------------------

- First visit → Skeleton UI
- API fetching → Spinner / shimmer
- Action submit → Button loading
- Error state → Empty / retry UI

------------------------------------------------
DESIGN SYSTEM RULES
------------------------------------------------

- Use existing theme classes
- Smooth animations (Framer Motion)
- Hover / active / focus states
- Subtle micro-interactions
- Consistent spacing & typography

------------------------------------------------
FORBIDDEN PRACTICES (FRONTEND)
------------------------------------------------

❌ Duplicated components  
❌ Inline API calls  
❌ Rewriting existing UI logic  
❌ Ignoring loading/error states  
❌ Hardcoded permissions  

------------------------------------------------
EXPECTED OUTPUT
------------------------------------------------

- Clean, scalable frontend architecture
- Smooth UX
- High performance
- ERP-grade UI quality





