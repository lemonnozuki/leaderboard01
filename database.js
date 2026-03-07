const Database = require('better-sqlite3');
const path = require('path');
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'leaderboard.db')
  : 'leaderboard.db';
const db = new Database(dbPath);

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

  CREATE TABLE IF NOT EXISTS noti_youtube (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    yt_channel_id TEXT NOT NULL,
    yt_channel_name TEXT NOT NULL,
    last_video_id TEXT,
    interval_minutes INTEGER DEFAULT 10,
    UNIQUE(guild_id, yt_channel_id)
  );

  CREATE TABLE IF NOT EXISTS noti_twitch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    twitch_username TEXT NOT NULL,
    is_live INTEGER DEFAULT 0,
    interval_minutes INTEGER DEFAULT 2,
    UNIQUE(guild_id, twitch_username)
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
  addYoutubeNoti(guildId, channelId, ytChannelId, ytChannelName, intervalMinutes) {
    return db.prepare(`
      INSERT INTO noti_youtube (guild_id, channel_id, yt_channel_id, yt_channel_name, interval_minutes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, yt_channel_id) DO UPDATE SET channel_id = ?, interval_minutes = ?
    `).run(guildId, channelId, ytChannelId, ytChannelName, intervalMinutes, channelId, intervalMinutes);
  },
  removeYoutubeNoti(guildId, ytChannelId) {
    return db.prepare('DELETE FROM noti_youtube WHERE guild_id = ? AND yt_channel_id = ?').run(guildId, ytChannelId);
  },
  listYoutubeNoti(guildId) {
    return db.prepare('SELECT * FROM noti_youtube WHERE guild_id = ?').all(guildId);
  },
  getAllYoutubeNoti() {
    return db.prepare('SELECT * FROM noti_youtube').all();
  },
  updateYoutubeLastVideo(id, videoId) {
    return db.prepare('UPDATE noti_youtube SET last_video_id = ? WHERE id = ?').run(videoId, id);
  },
  addTwitchNoti(guildId, channelId, twitchUsername, intervalMinutes) {
    return db.prepare(`
      INSERT INTO noti_twitch (guild_id, channel_id, twitch_username, interval_minutes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, twitch_username) DO UPDATE SET channel_id = ?, interval_minutes = ?
    `).run(guildId, channelId, twitchUsername, intervalMinutes, channelId, intervalMinutes);
  },
  removeTwitchNoti(guildId, twitchUsername) {
    return db.prepare('DELETE FROM noti_twitch WHERE guild_id = ? AND twitch_username = ?').run(guildId, twitchUsername);
  },
  listTwitchNoti(guildId) {
    return db.prepare('SELECT * FROM noti_twitch WHERE guild_id = ?').all(guildId);
  },
  getAllTwitchNoti() {
    return db.prepare('SELECT * FROM noti_twitch').all();
  },
  updateTwitchLiveStatus(id, isLive) {
    return db.prepare('UPDATE noti_twitch SET is_live = ? WHERE id = ?').run(isLive ? 1 : 0, id);
  },
};