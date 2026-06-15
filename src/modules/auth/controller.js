const authService = require('./service');
const { successResponse } = require('../../shared/utils/response');
const { loginSchema, registerSchema } = require('./validator');

class AuthController {
  async login(req, res, next) {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await authService.login(value.username, value.password);
      return successResponse(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
      if (error) throw error;

      const result = await authService.register(value);
      return successResponse(res, result, 'User registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
