const { MongoClient, ObjectId } = require('mongodb');
const { validateAuth } = require('./_auth');

let cachedClient = null;

async function getCollection() {
  if (!cachedClient || !cachedClient.topology?.isConnected()) {
    cachedClient = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  return cachedClient.db('sana-dair').collection('notes');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI ortam değişkeni ayarlanmamış' });
  }

  try {
    const col = await getCollection();

    // ── GET: Tüm notları getir (herkese/çifte açık) ──────────────────────────
    if (req.method === 'GET') {
      const notes = await col
        .find({})
        .sort({ pinned: -1, createdAt: -1 })
        .toArray();
      return res.status(200).json(notes);
    }

    // ── POST: Yeni not ekle ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { title, content, category, author } = req.body || {};
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Not içeriği boş olamaz' });
      }
      const note = {
        title: (title || '').trim(),
        content: content.trim(),
        category: category || 'love', // love, plan, todo, memory
        author: author || 'Çiftimiz',
        pinned: false,
        createdAt: new Date(),
      };
      const result = await col.insertOne(note);
      return res.status(201).json({ _id: result.insertedId, ...note });
    }

    // ── PUT: Not güncelle (pinleme veya düzenleme) ─────────────────────────
    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Geçersiz not ID\'si' });
      }
      const updateData = {};
      const { title, content, category, pinned } = req.body || {};
      if (typeof pinned === 'boolean') updateData.pinned = pinned;
      if (typeof title === 'string') updateData.title = title.trim();
      if (typeof content === 'string') updateData.content = content.trim();
      if (typeof category === 'string') updateData.category = category;

      updateData.updatedAt = new Date();

      const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Not bulunamadı' });
      }
      return res.status(200).json({ ok: true });
    }

    // ── DELETE: Not sil ─────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Geçersiz not ID\'si' });
      }
      const result = await col.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Not bulunamadı' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[notes API error]', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};
