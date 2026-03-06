const Database = require('better-sqlite3');
const db = new Database('leaderboard.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    UNIQUE(guild_id, name)
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    score REAL DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE,
    UNIQUE(board_id, user_id)
  );
`);

module.exports = {
  createBoard(guildId, name, description, createdBy) {
    return db.prepare(
      'INSERT INTO boards (guild_id, name, description, created_by) VALUES (?, ?, ?, ?)'
    ).run(guildId, name.toLowerCase(), description, createdBy);
  },

  deleteBoard(guildId, name) {
    return db.prepare('DELETE FROM boards WHERE guild_id = ? AND name = ?').run(guildId, name.toLowerCase());
  },

  getBoard(guildId, name) {
    return db.prepare('SELECT * FROM boards WHERE guild_id = ? AND name = ?').get(guildId, name.toLowerCase());
  },

  listBoards(guildId) {
    return db.prepare('SELECT * FROM boards WHERE guild_id = ? ORDER BY name').all(guildId);
  },

  setScore(boardId, userId, score) {
    return db.prepare(`
      INSERT INTO entries (board_id, user_id, score, updated_at)
      VALUES (?, ?, ?, strftime('%s','now'))
      ON CONFLICT(board_id, user_id) DO UPDATE SET score = ?, updated_at = strftime('%s','now')
    `).run(boardId, userId, score, score);
  },

  addScore(boardId, userId, amount) {
    return db.prepare(`
      INSERT INTO entries (board_id, user_id, score, updated_at)
      VALUES (?, ?, ?, strftime('%s','now'))
      ON CONFLICT(board_id, user_id) DO UPDATE SET score = score + ?, updated_at = strftime('%s','now')
    `).run(boardId, userId, amount, amount);
  },

  removeEntry(boardId, userId) {
    return db.prepare('DELETE FROM entries WHERE board_id = ? AND user_id = ?').run(boardId, userId);
  },

  getTop(boardId, limit = 10) {
    return db.prepare(`
      SELECT user_id, score FROM entries
      WHERE board_id = ?
      ORDER BY score DESC
      LIMIT ?
    `).all(boardId, limit);
  },

  getUserRank(boardId, userId) {
    const rank = db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM entries
      WHERE board_id = ? AND score > (
        SELECT COALESCE(score, -999999) FROM entries WHERE board_id = ? AND user_id = ?
      )
    `).get(boardId, boardId, userId);

    const entry = db.prepare('SELECT score FROM entries WHERE board_id = ? AND user_id = ?').get(boardId, userId);

    return entry ? { rank: rank.rank, score: entry.score } : null;
  },
};