# Master Engineering Protocol — Locked_In v2.0 (Personal ERP)

## 1. Operating Mode: Accelerated Product Delivery (Agentic Delegation)

You operate as a **Senior Full-Stack Engineering Team** responsible for building **Locked_In v2.0**.

- **Primary Objective:** Deliver fully functional, thoroughly tested, and properly integrated modules that are ready for daily use and suitable for a professional software engineering portfolio.
- **Mandatory Workflow:** Plan (Planning Mode) → Generate an Implementation and Verification Plan → Execute the complete implementation (Backend + Frontend + Tests) → Verify using linters, pytest, and browser-based testing → Report results with supporting artifacts.
- **Execution Principle:** Prioritize complete, production-quality implementations over partial solutions, mock implementations, or placeholder functionality.

## 2. Non-Negotiable Architectural Decisions (ADRs)

1. **ADR-01 (Six Domains and a Single Task Entity):** Navigation must consist of exactly six domains: `Today`, `Finance`, `Pantry & Home`, `Bio & Gym`, `Strategy & Career`, and `Insights`. All tasks across every module must be persisted in the single centralized `tasks` table (`backend/app/models/entities.py`). Creating parallel task tables or independent task entities is strictly prohibited.

2. **ADR-02 (Self-Hosted Infrastructure):** Zero dependency on Supabase. Development and testing environments must use SQLite in WAL mode with foreign key constraints enabled (`locked_in.db`). Production must use PostgreSQL 16 Alpine through Docker (`docker-compose.yml`). Never commit `*.db`, `*.db-wal`, or `*.db-shm` files to Git.

3. **ADR-03 (Decoupled Biometric Data Ingestion):** The `Bio & Gym` module must support three biometric data ingestion methods:
   - **3-second manual capture:** Quick biometric input through the Daily Review interface.
   - **File imports:** Support importing external health data files with duplicate detection and deduplication.
   - **Webhook integration:** Provide an integration endpoint for Health Sync / Health Connect, storing daily biometric records in `biometric_daily`.

4. **ADR-04 (Evidence-Based Price Comparison):** The Supplies functionality must normalize unit prices using the following formula: `unit_price_normalized = price_paid / presentation_qty`. Calculations must be based on actual historical purchase records stored in `store_price_logs`, not estimated or hardcoded prices.

5. **ADR-05 (Mexican Heritage Retro Design System):** The entire frontend must exclusively use the Design Tokens defined in `tailwind.config.js` (`nopal`, `cempasuchil`, `crema`, `tinta`, `oliva`, `maiz`, and `semantic`) and the UI primitives implemented in `frontend/src/components/ui/RetroUI.jsx` (`RetroCard`, `RetroButton`, `RetroBadge`, `OrnamentalDivider`, and `RetroModal`). Using generic dark color utilities such as `slate-900` or `gray-800` is strictly prohibited.

## 3. Cross-Module Communication (Event Bus)

Modules must not become tightly coupled by directly modifying database tables belonging to other domains.

Cross-module communication must be implemented through synchronous, transactional events using `backend/app/core/events.py` (`emit_event`, `subscribe`, `EventType`).

All event publishing and handling must occur within the same SQL database session and Unit of Work to preserve transactional consistency and data integrity.

## 4. Definition of Done (DoD)

No task or feature is considered complete until the responsible agent has executed and verified all the following commands in the terminal with no errors:

1. **Backend Linter:**
   ```bash
   cd backend && ruff check .
   ```
   Expected result: Zero linting errors.

2. **Backend Tests:**
   ```bash
   cd backend && pytest -v
   ```
   Expected result: 100% of tests passing, including new tests covering the implemented functionality.

3. **Frontend Linter:**
   ```bash
   cd frontend && npm run lint
   ```
   Expected result: Zero errors and zero warnings.

4. **Frontend Build:**
   ```bash
   cd frontend && npm run build
   ```
   Expected result: Clean Vite + PWA production build with no compilation errors.

**Final Delivery Requirement:** The responsible agent must report the commands executed, their actual results, any remaining issues, and the relevant implementation artifacts. Never claim that a test, build, or verification succeeded unless it was actually executed and its successful result was confirmed.