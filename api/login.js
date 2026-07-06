const { getExpectedToken } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { user, pass } = req.body || {};

  if (!user || !pass) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
  }

  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;

  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: 'Sunucu yapılandırma hatası: env değişkenleri eksik' });
  }

  if (user === expectedUser && pass === expectedPass) {
    return res.status(200).json({ token: getExpectedToken() });
  }

  return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
};
