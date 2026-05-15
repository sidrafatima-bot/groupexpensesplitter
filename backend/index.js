const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize all tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(100)        NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT                NOT NULL,
        avatar_url    TEXT,
        created_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id           SERIAL PRIMARY KEY,
        group_name   VARCHAR(150)    NOT NULL,
        created_by   INT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        currency     VARCHAR(10)     NOT NULL DEFAULT 'USD',
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        group_id   INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id    INT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        joined_at  TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (group_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id              SERIAL PRIMARY KEY,
        group_id        INT            NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
        paid_by_user_id INT            NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        description     TEXT           NOT NULL,
        date            DATE           NOT NULL DEFAULT CURRENT_DATE,
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS splits (
        id          SERIAL PRIMARY KEY,
        expense_id  INT            NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        user_id     INT            NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        amount_owed NUMERIC(12, 2) NOT NULL CHECK (amount_owed >= 0),
        is_paid     BOOLEAN        NOT NULL DEFAULT FALSE,
        settled_at  TIMESTAMP,
        UNIQUE (expense_id, user_id)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ DB init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

initDB();

module.exports = pool;
