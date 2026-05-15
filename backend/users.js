const express       = require('express');
const pool          = require('../db');
const authenticate  = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me  — get own profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/users/me  — update own profile
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;
    const { rows } = await pool.query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING id, name, email, avatar_url, created_at`,
      [name, avatar_url, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
