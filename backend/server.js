const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes      = require('./routes/auth');
const groupRoutes     = require('./routes/groups');
const expenseRoutes   = require('./routes/expenses');
const splitRoutes     = require('./routes/splits');
const userRoutes      = require('./routes/users');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/groups',   groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/splits',   splitRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
