// src/passwordValidation.js
const HttpError = require('./utils/httpError');
const config = require('./config');

function checkPasswordPolicy(password) {
  if (typeof password !== 'string') {
    throw new HttpError(400, 'Password must be a string');
  }

  if (password.length < config.minPasswordLength) {
    throw new HttpError(400, `Password must be at least ${config.minPasswordLength} characters`);
  }

  if (password.length > 128) {
    throw new HttpError(400, 'Password is too long (max 128 characters)');
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const missing = [];
  if (!hasUppercase) missing.push('uppercase letter');
  if (!hasLowercase) missing.push('lowercase letter');
  if (!hasNumbers) missing.push('number');
  if (!hasSpecialChars) missing.push('special character (!@#$%^&* etc.)');

  if (missing.length > 0) {
    throw new HttpError(400, `Password must contain: ${missing.join(', ')}`);
  }
}

module.exports = { checkPasswordPolicy };