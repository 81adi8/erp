// FIXED: Added missing PATCH, DELETE, and status endpoints.
// Frontend (institutions.ts) calls:
//   PATCH  /institutions/:id         → updateInstitution
//   DELETE /institutions/:id         → deleteInstitution
//   PATCH  /institutions/:id/status  → updateInstitutionStatus
// Backend only had POST / GET / GET-by-id — causing 404s masked by mock fallbacks.
import { Router } from "express";
import { InstitutionController } from "../../controllers/institution/institution.controller";

const institutionRouter = Router();
const instController = new InstitutionController();

// ── Read ──────────────────────────────────────────────────────────────────────
institutionRouter.get('/', instController.findAll);
institutionRouter.get('/:id', instController.getById);

// ── Create ────────────────────────────────────────────────────────────────────
institutionRouter.post('/', instController.create);

// ── Update (FIXED: was missing) ───────────────────────────────────────────────
institutionRouter.patch('/:id', instController.update);
institutionRouter.put('/:id', instController.update);   // PUT alias for completeness

// ── Status toggle (FIXED: was missing) ───────────────────────────────────────
institutionRouter.patch('/:id/status', instController.updateStatus);

// ── Delete (FIXED: was missing) ───────────────────────────────────────────────
institutionRouter.delete('/:id', instController.delete);

export default institutionRouter;
