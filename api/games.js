const { MongoClient } = require('mongodb');

let cachedClient = null;

async function getCollection() {
  if (!cachedClient || !cachedClient.topology?.isConnected()) {
    cachedClient = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  return cachedClient.db('sana-dair').collection('game_state');
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
    const { game } = req.query;

    // ── GET: Oyun durumunu getir ─────────────────────────────────────────────
    if (req.method === 'GET') {
      if (game === 'xox') {
        const state = await col.findOne({ key: 'xox' });
        return res.status(200).json(state || {
          key: 'xox',
          board: Array(9).fill(null),
          turn: 'X', // X: Ben, O: Sevgilim
          winner: null
        });
      }

      if (game === 'story') {
        const state = await col.findOne({ key: 'story' });
        return res.status(200).json(state || {
          key: 'story',
          sentences: [
            { author: 'Sistem', text: 'Bir varmış bir yokmuş, birbirini çok seven iki kişi varmış...', date: new Date() }
          ]
        });
      }

      if (game === 'trivia') {
        const state = await col.findOne({ key: 'trivia' });
        return res.status(200).json(state || {
          key: 'trivia',
          currentQuestionIndex: 0,
          answers: { ben: null, sevgili: null }
        });
      }

      // Genel oyun listesi veya durumu
      const allGames = await col.find({}).toArray();
      return res.status(200).json(allGames);
    }

    // ── POST: Oyun durumunu güncelle / hamle yap ─────────────────────────────
    if (req.method === 'POST') {
      const { type, payload } = req.body || {};

      if (type === 'xox_move') {
        const { index, player } = payload; // index 0..8, player 'X'|'O'
        let state = await col.findOne({ key: 'xox' });
        if (!state) {
          state = { key: 'xox', board: Array(9).fill(null), turn: 'X', winner: null };
        }

        if (state.winner || state.board[index] !== null) {
          return res.status(400).json({ error: 'Geçersiz hamle' });
        }

        state.board[index] = player;
        state.turn = player === 'X' ? 'O' : 'X';

        // Kazanan kontrolü
        const lines = [
          [0,1,2],[3,4,5],[6,7,8],
          [0,3,6],[1,4,7],[2,5,8],
          [0,4,8],[2,4,6]
        ];
        for (const [a,b,c] of lines) {
          if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
            state.winner = state.board[a];
            break;
          }
        }
        if (!state.winner && state.board.every(cell => cell !== null)) {
          state.winner = 'DRAW';
        }

        await col.updateOne({ key: 'xox' }, { $set: state }, { upsert: true });
        return res.status(200).json(state);
      }

      if (type === 'xox_reset') {
        const newState = { key: 'xox', board: Array(9).fill(null), turn: 'X', winner: null };
        await col.updateOne({ key: 'xox' }, { $set: newState }, { upsert: true });
        return res.status(200).json(newState);
      }

      if (type === 'story_add') {
        const { author, text } = payload;
        if (!text || !text.trim()) return res.status(400).json({ error: 'Metin boş olamaz' });

        let state = await col.findOne({ key: 'story' });
        if (!state) {
          state = { key: 'story', sentences: [] };
        }
        state.sentences.push({
          author: author || 'Anonim',
          text: text.trim(),
          date: new Date()
        });

        await col.updateOne({ key: 'story' }, { $set: state }, { upsert: true });
        return res.status(200).json(state);
      }

      if (type === 'trivia_answer') {
        const { partner, answer, qIndex } = payload;
        let state = await col.findOne({ key: 'trivia' });
        if (!state) {
          state = { key: 'trivia', currentQuestionIndex: qIndex || 0, answers: { ben: null, sevgili: null } };
        }

        if (state.currentQuestionIndex !== qIndex) {
          state.currentQuestionIndex = qIndex;
          state.answers = { ben: null, sevgili: null };
        }

        if (partner === 'Ben') state.answers.ben = answer;
        if (partner === 'Sevgilim') state.answers.sevgili = answer;

        await col.updateOne({ key: 'trivia' }, { $set: state }, { upsert: true });
        return res.status(200).json(state);
      }

      return res.status(400).json({ error: 'Geçersiz işlem türü' });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('[games API error]', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};
