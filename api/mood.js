const { MongoClient } = require('mongodb');

let cachedClient = null;

async function getCollection() {
  if (!cachedClient || !cachedClient.topology?.isConnected()) {
    cachedClient = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  return cachedClient.db('sana-dair').collection('moods');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI ortam değişkeni ayarlanmamış' });
  }

  try {
    const col = await getCollection();

    // ── GET: Neşe ve Mete'nin son ruh halleri, konum ve fotoğrafları ───────────
    if (req.method === 'GET') {
      const neseMood = await col.findOne({ partner: 'Neşe' });
      const meteMood = await col.findOne({ partner: 'Mete' });

      return res.status(200).json({
        nese: neseMood || {
          partner: 'Neşe',
          emoji: '🥰',
          text: 'Çok Mutlu',
          note: 'Seninle olmak harika!',
          location: 'Ev',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          updatedAt: new Date()
        },
        mete: meteMood || {
          partner: 'Mete',
          emoji: '💖',
          text: 'Aşık',
          note: 'Seni çok özledim',
          location: 'Lunapark',
          avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
          updatedAt: new Date()
        }
      });
    }

    // ── POST: Ruh halini, konumunu ve profil resmini güncelle ───────────────
    if (req.method === 'POST') {
      const { partner, emoji, text, note, location, avatarUrl } = req.body || {};
      if (!partner || (partner !== 'Neşe' && partner !== 'Mete')) {
        return res.status(400).json({ error: 'Geçerli partner seçimi ("Neşe" veya "Mete") gereklidir.' });
      }

      const moodData = {
        partner,
        emoji: emoji || '🥰',
        text: text || 'Mutlu',
        note: (note || '').trim(),
        location: (location || '').trim(),
        avatarUrl: avatarUrl || (partner === 'Neşe' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'),
        updatedAt: new Date()
      };

      await col.updateOne({ partner }, { $set: moodData }, { upsert: true });
      return res.status(200).json({ ok: true, mood: moodData });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[mood API error]', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};
