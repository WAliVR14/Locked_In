-- docs/schema.sql
-- 1. Users (Supports your real account and the 'demo' account for recruiters)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'admin' o 'demo'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Finance: Accounts and Transactions
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ex: Debit, Cash, Savings
    balance NUMERIC(12, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'income' o 'expense'
    category VARCHAR(50) NOT NULL, -- ''Supermarket', 'Gym', 'Outings', etc.
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pantry and Inventory
CREATE TABLE IF NOT EXISTS pantry_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    current_qty NUMERIC(8, 2) NOT NULL DEFAULT 0,
    min_qty NUMERIC(8, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'pz', -- 'kg', 'L', 'pz'
    estimated_price NUMERIC(10, 2) DEFAULT 0.00
);

-- 4. Gym Tracker
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Ex., Military Press, Bulgarian Squat
    muscle_group VARCHAR(50) NOT NULL -- 'Push', 'Pull', 'Legs'
);

CREATE TABLE IF NOT EXISTS workout_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    weight_kg NUMERIC(6, 2) NOT NULL,
    reps INTEGER NOT NULL,
    rpe INTEGER DEFAULT 8, -- Esfuerzo percibido (1-10)
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Goals, Projects, and Social CRM
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50), -- 'Engineering', 'Languages', 'Personnel'
    progress_pct INTEGER DEFAULT 0,
    deadline DATE
);

CREATE TABLE IF NOT EXISTS social_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50), -- 'Partner', 'Family', 'Friends'
    birthday DATE,
    gift_ideas TEXT
);