# Locked_In - Personal ERP & Telemetry System
![CI Status](https://github.com/WAliVR14/locked_in/actions/workflows/ci.yml/badge.svg)

Unified system for life management: finances, inventory, physical training, and goals.

## Database Architecture
```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : owns
    USERS ||--o{ PANTRY_ITEMS : manages
    USERS ||--o{ WORKOUT_LOGS : tracks
    USERS ||--o{ PROJECTS : leads
    USERS ||--o{ SOCIAL_CONTACTS : knows
    ACCOUNTS ||--o{ TRANSACTIONS : records
    EXERCISES ||--o{ WORKOUT_LOGS : includes