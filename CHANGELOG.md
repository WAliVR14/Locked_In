# Changelog

All notable changes to the **Locked_In** project will be documented in this file.

## [0.1.0] - Phase 1: Core Architecture, Auth & App Shell

### Added
- **Backend Core:** Modular FastAPI architecture with global exception handling and `/api/v1/health` + `/api/v1/system/summary` endpoints.
- **Database Layer:** Relational schema in PostgreSQL (Supabase) using SQLModel ORM (`users`, `accounts`, `transactions`, `pantry_items`, `exercises`, `workout_logs`, `projects`, `social_contacts`).
- **Security & Multi-Tenancy:** JWT authentication, `bcrypt` password hashing, and 1-click isolated `demo` tenant provisioning.
- **Frontend & PWA:** React + Vite + TailwindCSS responsive interface featuring an adaptive App Shell (Desktop Sidebar + Mobile Bottom Navigation Bar) and PWA manifest configuration.
- **CI/CD & QA:** Automated GitHub Actions pipeline running `ruff` linter and `pytest` unit test suite on every push and Pull Request.