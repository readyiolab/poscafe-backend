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

const { frontendUrl, isProduction } = require('./shared/config/dotenvConfig');

const app = express();

if (isProduction) {
  app.set('trust proxy', 1);
}

// Middlewares
app.use(helmet());
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
if (!isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/** Mount at /api/... and /... so login works if nginx strips the /api prefix on proxy_pass */
function useApi(mountPath, router) {
  app.use(`/api${mountPath}`, router);
  app.use(mountPath, router);
}

// Routes Registration
useApi('/auth', authRoutes);
useApi('/tables', tablesRoutes);
useApi('/categories', categoriesRoutes);
useApi('/menu', menuRoutes);
useApi('/inventory', inventoryRoutes);
useApi('/recipes', recipesRoutes);
useApi('/orders', ordersRoutes);
useApi('/billing', billingRoutes);
useApi('/users', usersRoutes);
useApi('/dashboard', dashboardRoutes);
useApi('/analytics', analyticsRoutes);
useApi('/transactions', transactionsRoutes);
useApi('/offers', offersRoutes);
useApi('/petty-cash', pettyCashRoutes);
useApi('/customers', customersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error Handling
app.use(errorHandler);

module.exports = app;
