require('dotenv').config();

const INSECURE_JWT_SECRETS = new Set([
  'supersecretkey',
  'production_secret_key_change_this',
  'your-random-64-character-jwt-secret',
  'replace_with_long_random_secret',
]);

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port: parseInt(process.env.PORT, 10) || 7000,
  dbHost: process.env.DB_HOST || 'localhost',
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS || '',
  dbName: process.env.DB_NAME || 'cafe_pos',
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

function validateConfig() {
  const errors = [];

  if (isProduction) {
    if (!process.env.JWT_SECRET || INSECURE_JWT_SECRETS.has(process.env.JWT_SECRET)) {
      errors.push('JWT_SECRET must be a strong random value (not the default placeholder).');
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET should be at least 32 characters.');
    }
    if (!process.env.FRONTEND_URL) {
      errors.push('FRONTEND_URL must be set to your production frontend domain.');
    }
    if (process.env.FRONTEND_URL?.includes('localhost')) {
      errors.push('FRONTEND_URL should not point to localhost in production.');
    }
    if (!process.env.DB_PASS) {
      errors.push('DB_PASS must be set in production.');
    }
  } else if (!process.env.JWT_SECRET || INSECURE_JWT_SECRETS.has(process.env.JWT_SECRET)) {
    console.warn(
      '[config] Warning: Using a weak JWT_SECRET. Set JWT_SECRET in backend/.env before production.'
    );
  }

  if (errors.length > 0) {
    console.error('\n❌ Production configuration failed:\n');
    errors.forEach((msg) => console.error(`   • ${msg}`));
    console.error('\nCopy backend/.env.example to backend/.env and fill in real values.\n');
    process.exit(1);
  }
}

module.exports = {
  ...config,
  validateConfig,
};
