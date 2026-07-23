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

const defaultMoods = {
  nese: {
    partner: 'Neşe',
    emoji: '🥰',
    text: 'Çok Mutlu',
    note: 'Seninle olmak harika!',
    location: 'Ev',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    updatedAt: new Date()
  },
  mete: {
    partner: 'Mete',
    emoji: '💖',
    text: 'Aşık',
    note: 'Seni çok özledim',
    location: 'Lunapark',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    updatedAt: new Date()
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    if (!process.env.MONGODB_URI) {
      return res.status(200).json(defaultMoods);
    }
    try {
      const col = await getCollection();
      const neseMood = await col.findOne({ partner: 'Neşe' });
      const meteMood = await col.findOne({ partner: 'Mete' });
      return res.status(200).json({
        nese: neseMood || defaultMoods.nese,
        mete: meteMood || defaultMoods.mete
      });
    } catch (err) {
      console.error('[mood GET error]', err);
      return res.status(200).json(defaultMoods);
    }
  }

  if (req.method === 'POST') {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ error: 'MONGODB_URI ortam değişkeni henüz tanımlanmamış.' });
    }
    try {
      const col = await getCollection();
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
    } catch (err) {
      console.error('[mood POST error]', err);
      return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  return res.status(405).end();
};
