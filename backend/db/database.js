// db/database.js
// Capa de acceso a SQLite: historial de mensajes y metadatos de archivos.

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'link_transfer.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

// --- Esquema ---
db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,          -- 'pc' | 'mobile'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,     -- nombre único en /uploads
  sender TEXT NOT NULL,          -- 'pc' | 'mobile'
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pairing (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token TEXT NOT NULL,
  pin TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// --- Mensajes ---
function insertMessage(sender, content) {
  const stmt = db.prepare('INSERT INTO messages (sender, content) VALUES (?, ?)');
  const info = stmt.run(sender, content);
  return getMessageById(info.lastInsertRowid);
}

function getMessageById(id) {
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

function getMessages(limit = 200) {
  return db
    .prepare('SELECT * FROM messages ORDER BY id DESC LIMIT ?')
    .all(limit)
    .reverse();
}

// --- Archivos ---
function insertFile({ originalName, storedName, sender, mimeType, sizeBytes }) {
  const stmt = db.prepare(
    `INSERT INTO files (original_name, stored_name, sender, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(originalName, storedName, sender, mimeType, sizeBytes);
  return getFileById(info.lastInsertRowid);
}

function getFileById(id) {
  return db.prepare('SELECT * FROM files WHERE id = ?').get(id);
}

function getFiles(limit = 200) {
  return db
    .prepare('SELECT * FROM files ORDER BY id DESC LIMIT ?')
    .all(limit);
}

// --- Emparejamiento (token + PIN vigentes) ---
function setPairing(token, pin) {
  db.prepare(
    `INSERT INTO pairing (id, token, pin, updated_at)
     VALUES (1, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET token = excluded.token, pin = excluded.pin, updated_at = datetime('now')`
  ).run(token, pin);
}

function getPairing() {
  return db.prepare('SELECT * FROM pairing WHERE id = 1').get();
}

module.exports = {
  insertMessage,
  getMessages,
  insertFile,
  getFiles,
  setPairing,
  getPairing,
};
