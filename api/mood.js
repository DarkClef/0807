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

    // ── GET: İki kişinin de son ruh hallerini getir ──────────────────────────
    if (req.method === 'GET') {
      const benMood = await col.findOne({ partner: 'Ben' });
      const sevgiliMood = await col.findOne({ partner: 'Sevgilim' });

      return res.status(200).json({
        ben: benMood || { partner: 'Ben', emoji: '🥰', text: 'Çok Mutlu', note: 'Seninle olmak harika!', updatedAt: new Date() },
        sevgili: sevgiliMood || { partner: 'Sevgilim', emoji: '💖', text: 'Aşık', note: 'Seni çok özledim', updatedAt: new Date() }
      });
    }

    // ── POST: Kendi ruh halini güncelle ──────────────────────────────────────
    if (req.method === 'POST') {
      const { partner, emoji, text, note } = req.body || {};
      if (!partner || (partner !== 'Ben' && partner !== 'Sevgilim')) {
        return res.status(400).json({ error: 'Geçerli partner seçimi ("Ben" veya "Sevgilim") gereklidir.' });
      }

      const moodData = {
        partner,
        emoji: emoji || '🥰',
        text: text || 'Mutlu',
        note: (note || '').trim(),
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
