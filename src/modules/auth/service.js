const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepo = require('./repository');
const { jwtSecret, jwtExpiresIn } = require('../../shared/config/dotenvConfig');

class AuthService {
  async login(username, password) {
    const user = await authRepo.findUserByUsername(username);
    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return {
      user: payload,
      token
    };
  }

  async register(data) {
    const existingUser = await authRepo.findUserByUsername(data.username);
    if (existingUser) {
      throw { statusCode: 409, message: 'Username already exists' };
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);

    const result = await authRepo.createUser({
      username: data.username,
      password_hash,
      role: data.role || 'staff'
    });

    return { id: result.insertId, username: data.username, role: data.role || 'staff' };
  }
}

module.exports = new AuthService();
