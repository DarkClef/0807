const { MongoClient, ObjectId } = require('mongodb');

// Bağlantı havuzu — serverless fonksiyonlar arasında yeniden kullanılır
let cachedClient = null;

async function getCollection() {
  if (!cachedClient || !cachedClient.topology?.isConnected()) {
    cachedClient = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  return cachedClient.db('sana-dair').collection('photos');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI ortam değişkeni ayarlanmamış' });
  }

  try {
    const col = await getCollection();

    // ── GET: Tüm fotoğrafları getir ──────────────────────────────────────────
    if (req.method === 'GET') {
      const photos = await col
        .find({}, { projection: { data: 1, caption: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json(photos);
    }

    // ── POST: Fotoğraf yükle (Doğrudan ana sayfadan) ─────────────────────────
    if (req.method === 'POST') {
      const { data, caption } = req.body || {};
      if (!data || !data.startsWith('data:image')) {
        return res.status(400).json({ error: 'Geçerli bir fotoğraf verisi gerekli' });
      }

      // Vercel serverless ve MongoDB boyut sınırı kontrolü (~4MB max base64)
      if (data.length > 4 * 1024 * 1024) {
        return res.status(413).json({ error: 'Fotoğraf boyutu çok yüksek. Yüklenmeden önce sıkıştırılmalıdır.' });
      }

      const result = await col.insertOne({
        data,
        caption: caption || '',
        createdAt: new Date(),
      });
      return res.status(201).json({ _id: result.insertedId });
    }

    // ── DELETE: Fotoğraf sil (Doğrudan ana sayfadan) ─────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Geçersiz fotoğraf ID\'si' });
      }
      const result = await col.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Fotoğraf bulunamadı' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[photos API error]', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};
