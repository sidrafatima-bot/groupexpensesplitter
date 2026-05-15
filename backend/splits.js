const express       = require('express');
const pool          = require('../db');
const authenticate  = require('../middleware/auth');

const router = express.Router();

// PATCH /api/splits/:expenseId/:userId/settle  — mark a split as paid
router.patch('/:expenseId/:userId/settle', authenticate, async (req, res, next) => {
  try {
    const { expenseId, userId } = req.params;

    // Only the logged-in user can settle their own split (or the payer can settle for others)
    if (parseInt(userId) !== req.user.id) {
      // Check if requester is the payer of this expense
      const payerRes = await pool.query(
        'SELECT paid_by_user_id FROM expenses WHERE id = $1', [expenseId]
      );
      if (!payerRes.rows.length) return res.status(404).json({ error: 'Expense not found' });
      if (payerRes.rows[0].paid_by_user_id !== req.user.id)
        return res.status(403).json({ error: 'Not authorized to settle this split' });
    }

    const { rows } = await pool.query(
      `UPDATE splits
       SET is_paid = TRUE, settled_at = NOW()
       WHERE expense_id = $1 AND user_id = $2
       RETURNING *`,
      [expenseId, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Split not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/splits/balances?group_id=  — net balance per user in a group
// Positive = they are owed money; Negative = they owe money
router.get('/balances', authenticate, async (req, res, next) => {
  try {
    const { group_id } = req.query;
    if (!group_id) return res.status(400).json({ error: 'group_id query param is required' });

    const { rows } = await pool.query(
      `WITH paid AS (
         -- What each user paid (total of expenses they created)
         SELECT paid_by_user_id AS user_id, SUM(amount) AS total_paid
         FROM expenses
         WHERE group_id = $1
         GROUP BY paid_by_user_id
       ),
       owed AS (
         -- What each user owes (unsettled splits)
         SELECT s.user_id, SUM(s.amount_owed) AS total_owed
         FROM splits s
         JOIN expenses e ON e.id = s.expense_id
         WHERE e.group_id = $1 AND s.is_paid = FALSE
         GROUP BY s.user_id
       )
       SELECT
         u.id,
         u.name,
         u.avatar_url,
         COALESCE(p.total_paid, 0) AS total_paid,
         COALESCE(o.total_owed,  0) AS total_owed,
         COALESCE(p.total_paid, 0) - COALESCE(o.total_owed, 0) AS net_balance
       FROM memberships m
       JOIN users u   ON u.id = m.user_id
       LEFT JOIN paid p ON p.user_id = u.id
       LEFT JOIN owed o ON o.user_id = u.id
       WHERE m.group_id = $1
       ORDER BY net_balance DESC`,
      [group_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/splits/my-debts  — all unsettled splits for the logged-in user
router.get('/my-debts', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, e.description, e.date, e.group_id,
              g.group_name, g.currency,
              u.name AS paid_by_name
       FROM splits s
       JOIN expenses e ON e.id = s.expense_id
       JOIN groups  g ON g.id = e.group_id
       JOIN users   u ON u.id = e.paid_by_user_id
       WHERE s.user_id = $1 AND s.is_paid = FALSE
       ORDER BY e.date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
