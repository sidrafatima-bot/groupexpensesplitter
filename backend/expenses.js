const express       = require('express');
const pool          = require('../db');
const authenticate  = require('../middleware/auth');

const router = express.Router();

// POST /api/expenses  — create an expense + auto-split equally
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { group_id, amount, description, date, split_with } = req.body;
    // split_with: optional array of user_ids; defaults to all group members

    if (!group_id || !amount || !description)
      return res.status(400).json({ error: 'group_id, amount, and description are required' });

    await client.query('BEGIN');

    // Create the expense
    const expRes = await client.query(
      `INSERT INTO expenses (group_id, paid_by_user_id, amount, description, date)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE))
       RETURNING *`,
      [group_id, req.user.id, amount, description, date || null]
    );
    const expense = expRes.rows[0];

    // Determine who to split with
    let memberIds = split_with;
    if (!memberIds || !memberIds.length) {
      const membersRes = await client.query(
        'SELECT user_id FROM memberships WHERE group_id = $1',
        [group_id]
      );
      memberIds = membersRes.rows.map(r => r.user_id);
    }

    // Equal split
    const perPerson = (parseFloat(amount) / memberIds.length).toFixed(2);

    const splitInserts = memberIds.map(uid =>
      client.query(
        `INSERT INTO splits (expense_id, user_id, amount_owed, is_paid)
         VALUES ($1, $2, $3, $4)`,
        [expense.id, uid, perPerson, uid === req.user.id] // payer's share is auto-settled
      )
    );
    await Promise.all(splitInserts);

    await client.query('COMMIT');
    res.status(201).json({ expense, splits_count: memberIds.length, amount_per_person: perPerson });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// GET /api/expenses?group_id=  — list expenses for a group
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { group_id } = req.query;
    if (!group_id) return res.status(400).json({ error: 'group_id query param is required' });

    const { rows } = await pool.query(
      `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by_user_id
       WHERE e.group_id = $1
       ORDER BY e.date DESC, e.created_at DESC`,
      [group_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/expenses/:id  — single expense with all splits
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const expRes = await pool.query(
      `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by_user_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!expRes.rows.length) return res.status(404).json({ error: 'Expense not found' });

    const splitsRes = await pool.query(
      `SELECT s.*, u.name, u.avatar_url
       FROM splits s
       JOIN users u ON u.id = s.user_id
       WHERE s.expense_id = $1`,
      [req.params.id]
    );

    res.json({ ...expRes.rows[0], splits: splitsRes.rows });
  } catch (err) { next(err); }
});

// DELETE /api/expenses/:id  — delete an expense (cascade deletes splits)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT paid_by_user_id FROM expenses WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Expense not found' });
    if (rows[0].paid_by_user_id !== req.user.id)
      return res.status(403).json({ error: 'Only the payer can delete this expense' });

    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
