const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'dev-fallback-secret';

function getExpectedToken() {
  return crypto
    .createHmac('sha256', SECRET)
    .update('admin-session-v1')
    .digest('hex');
}

function validateAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  return token === getExpectedToken();
}

module.exports = { validateAuth, getExpectedToken };
