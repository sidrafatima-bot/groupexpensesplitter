const express       = require('express');
const pool          = require('../db');
const authenticate  = require('../middleware/auth');

const router = express.Router();

// POST /api/groups  — create a group (auto-join creator)
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { group_name, currency } = req.body;
    if (!group_name) return res.status(400).json({ error: 'group_name is required' });

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO groups (group_name, created_by, currency)
       VALUES ($1, $2, $3) RETURNING *`,
      [group_name, req.user.id, currency || 'USD']
    );
    const group = rows[0];

    // Auto-add creator as member
    await client.query(
      'INSERT INTO memberships (group_id, user_id) VALUES ($1, $2)',
      [group.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json(group);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// GET /api/groups  — list all groups the logged-in user belongs to
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*, u.name AS created_by_name
       FROM groups g
       JOIN memberships m ON m.group_id = g.id
       JOIN users u       ON u.id = g.created_by
       WHERE m.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/groups/:id  — single group details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*, u.name AS created_by_name
       FROM groups g
       JOIN users u ON u.id = g.created_by
       WHERE g.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Group not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/groups/:id/members  — list members of a group
router.get('/:id/members', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, m.joined_at
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.group_id = $1
       ORDER BY m.joined_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/groups/:id/members  — add a user to a group by email
router.post('/:id/members', authenticate, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'No user with that email' });

    const userId = userRes.rows[0].id;

    await pool.query(
      `INSERT INTO memberships (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, userId]
    );
    res.json({ message: 'Member added successfully' });
  } catch (err) { next(err); }
});

// DELETE /api/groups/:id/members/:userId  — remove a member
router.delete('/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM memberships WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

module.exports = router;
