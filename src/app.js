const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./shared/middleware/errorHandler');

// Routes
const authRoutes = require('./modules/auth/routes');
const tablesRoutes = require('./modules/tables/routes');
const categoriesRoutes = require('./modules/categories/routes');
const menuRoutes = require('./modules/menu/routes');
const inventoryRoutes = require('./modules/inventory/routes');
const recipesRoutes = require('./modules/recipes/routes');
const ordersRoutes = require('./modules/orders/routes');
const billingRoutes = require('./modules/billing/routes');
const usersRoutes = require('./modules/users/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const analyticsRoutes = require('./modules/analytics/routes');
const transactionsRoutes = require('./modules/transactions/routes');
const offersRoutes = require('./modules/offers/routes');
const pettyCashRoutes = require('./modules/petty_cash/routes');
const customersRoutes = require('./modules/customers/routes');

const { frontendUrl } = require('./shared/config/dotenvConfig');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: frontendUrl || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes Registration
app.use('/api/auth', authRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/customers', customersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error Handling
app.use(errorHandler);

module.exports = app;
