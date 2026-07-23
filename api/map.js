const { MongoClient, ObjectId } = require('mongodb');

let cachedClient = null;

async function getCollection() {
  if (!cachedClient || !cachedClient.topology?.isConnected()) {
    cachedClient = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  return cachedClient.db('sana-dair').collection('map_pins');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI ortam değişkeni ayarlanmamış' });
  }

  try {
    const col = await getCollection();

    // ── GET: Tüm harita pinlerini getir ──────────────────────────
    if (req.method === 'GET') {
      const pins = await col.find({}).sort({ createdAt: -1 }).toArray();

      // Varsayılan özel pinler (Eğer henüz haritada hiç pin yoksa varsayılan Anıtkabir pini sunulur)
      if (pins.length === 0) {
        const defaultPin = {
          _id: "default-anitkabir",
          title: "Anıtkabir Ziyaretimiz 🏛️",
          note: "Birlikte gerçekleştirdiğimiz unutulmaz, çok özel ve anlamlı ziyaretimiz.",
          lat: 39.92505,
          lng: 32.83695,
          date: "08.07.2025",
          category: "Özel Ziyaret",
          photoUrl: ""
        };
        return res.status(200).json([defaultPin]);
      }

      return res.status(200).json(pins);
    }

    // ── POST: Yeni pin ekle ──────────────────────────────────────
    if (req.method === 'POST') {
      const { title, note, lat, lng, date, category, photoUrl } = req.body || {};
      if (!title || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Başlık, enlem (lat) ve boylam (lng) gereklidir.' });
      }

      const pin = {
        title: title.trim(),
        note: (note || '').trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        date: date || new Date().toLocaleDateString('tr-TR'),
        category: category || 'Anı',
        photoUrl: photoUrl || '',
        createdAt: new Date()
      };

      const result = await col.insertOne(pin);
      return res.status(201).json({ _id: result.insertedId, ...pin });
    }

    // ── DELETE: Pin sil ──────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Geçersiz pin ID' });
      }
      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[map API error]', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};
