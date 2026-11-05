---
name: locked-in-erp
description: Architecture standards, FastAPI endpoint patterns, transactional Event Bus conventions, Pytest testing practices, and Mexican Heritage Retro UI components for the Locked_In project.
---

# Locked_In Module Implementation Guide

## 1. Backend Endpoint Rules (FastAPI + SQLModel)

- **Router location:** `backend/app/api/v1/endpoints/<module>.py`.
- **Mandatory registration:** Every new router must be imported and registered in `backend/app/main.py` using `app.include_router(<module>.router)`.
- **Multi-Tenant Data Isolation:** Every database `select(...)` query must strictly filter records using `user_id == current_user.id` to prevent cross-user data access.
- **Domain Events:** Always call `session.flush()` before invoking `emit_event(...)`. Perform exactly one `session.commit()` at the end of the primary operation to maintain transactional consistency.

## 2. Frontend View Rules (React 19 + Tailwind + RetroUI)

- **Page location:** Implement module pages in `frontend/src/pages/<Module>.jsx` and connect them through `frontend/src/App.jsx` using the `activeTab` navigation state.
- **Mandatory UI Components:** Always import `RetroCard`, `RetroButton`, `RetroBadge`, `OrnamentalDivider`, and `RetroModal` from `../components/ui/RetroUI`.
- **React 19 ESLint Rules:** Inside `useEffect`, use a cleanup flag (`let isMounted = true`) when handling asynchronous initial data fetching. Set the flag to `false` in the cleanup function to prevent state updates after unmounting. Avoid calling state setters synchronously in the effect body.