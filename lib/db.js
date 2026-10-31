import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { scryptSync, randomBytes } from 'crypto';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
let _db = null;

/* ── Internal helpers ─────────────────────────────────────────────── */

function _hashPwd(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${hash}`;
}

function _normalize(str) {
  return (str ?? '').toLowerCase().trim();
}

/* ── Singleton DB init ────────────────────────────────────────────── */

function getDb() {
  if (_db) return _db;

  mkdirSync(DATA_DIR, { recursive: true });
  _db = new DatabaseSync(path.join(DATA_DIR, 'productivity.db'));
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA busy_timeout = 5000');

  // ── weekly_productivity ──────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_productivity (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      year        INTEGER NOT NULL,
      start_date  TEXT,
      day1_score  REAL,
      day2_score  REAL,
      day3_score  REAL,
      day4_score  REAL,
      day5_score  REAL,
      day6_score  REAL,
      day7_score  REAL,
      avg_score   REAL NOT NULL,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(week_number, year)
    )
  `);
  try { _db.exec('ALTER TABLE weekly_productivity ADD COLUMN start_date TEXT');   } catch (_) {}
  try { _db.exec('ALTER TABLE weekly_productivity ADD COLUMN insight_json TEXT'); } catch (_) {}

  // ── users ────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      full_name       TEXT,
      origin          TEXT,
      status          TEXT,
      address         TEXT,
      bio             TEXT,
      favorite_animal TEXT,
      father_name     TEXT,
      avatar_base64   TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── sessions ─────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);

  // ── Seed default account (alif / 123) ───────────────────────────
  const existing = _db.prepare('SELECT id FROM users WHERE username = ?').get('alif');
  if (!existing) {
    _db.prepare(`
      INSERT INTO users (username, password_hash, full_name, origin, status, favorite_animal, father_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'alif',
      _hashPwd('123'),
      'Alif',
      '',
      'mahasiswa',
      _normalize('kucing'),
      _normalize('iwan'),
    );
  }

  return _db;
}

/* ═══════════════════════════════════════════════════════════════════
   WEEKLY PRODUCTIVITY
═══════════════════════════════════════════════════════════════════ */

export function upsertWeek(weekNumber, year, startDate, dayScores, avgScore) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO weekly_productivity
      (week_number, year, start_date,
       day1_score, day2_score, day3_score, day4_score,
       day5_score, day6_score, day7_score,
       avg_score, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(week_number, year) DO UPDATE SET
      start_date = excluded.start_date,
      day1_score = excluded.day1_score,
      day2_score = excluded.day2_score,
      day3_score = excluded.day3_score,
      day4_score = excluded.day4_score,
      day5_score = excluded.day5_score,
      day6_score = excluded.day6_score,
      day7_score = excluded.day7_score,
      avg_score  = excluded.avg_score,
      updated_at = excluded.updated_at
  `).run(
    weekNumber, year, startDate ?? null,
    dayScores[0] ?? null, dayScores[1] ?? null, dayScores[2] ?? null,
    dayScores[3] ?? null, dayScores[4] ?? null, dayScores[5] ?? null,
    dayScores[6] ?? null, avgScore
  );
}

export function getWeek(weekNumber, year) {
  return getDb().prepare(
    'SELECT * FROM weekly_productivity WHERE week_number = ? AND year = ?'
  ).get(weekNumber, year);
}

export function getRecentWeeks(limit = 12) {
  return getDb().prepare(
    'SELECT * FROM weekly_productivity ORDER BY year DESC, week_number DESC LIMIT ?'
  ).all(limit);
}

export function getAllWeeks(year = null) {
  const db = getDb();
  if (year) {
    return db.prepare(
      'SELECT * FROM weekly_productivity WHERE year = ? ORDER BY week_number ASC'
    ).all(year);
  }
  return db.prepare(
    'SELECT * FROM weekly_productivity ORDER BY year DESC, week_number DESC'
  ).all();
}

export function upsertInsight(weekNumber, year, insightPayload) {
  getDb().prepare(`
    UPDATE weekly_productivity SET insight_json = ? WHERE week_number = ? AND year = ?
  `).run(JSON.stringify(insightPayload), weekNumber, year);
}

export function getStats() {
  return getDb().prepare(`
    SELECT
      COUNT(*)                 AS total_weeks,
      ROUND(AVG(avg_score), 2) AS overall_avg,
      ROUND(MAX(avg_score), 2) AS best_score,
      (SELECT week_number FROM weekly_productivity ORDER BY avg_score DESC LIMIT 1) AS best_week,
      (SELECT year        FROM weekly_productivity ORDER BY avg_score DESC LIMIT 1) AS best_week_year
    FROM weekly_productivity
  `).get();
}

/* ═══════════════════════════════════════════════════════════════════
   USERS
═══════════════════════════════════════════════════════════════════ */

export function createUser({ username, password_hash, full_name, origin, status, favorite_animal, father_name }) {
  return getDb().prepare(`
    INSERT INTO users (username, password_hash, full_name, origin, status, favorite_animal, father_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username, password_hash, full_name ?? null, origin ?? null, status ?? null,
    _normalize(favorite_animal), _normalize(father_name));
}

export function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function updateUser(id, fields) {
  const db = getDb();
  const allowed = ['full_name','origin','status','address','bio','avatar_base64','password_hash'];
  const sets    = Object.keys(fields).filter(k => allowed.includes(k));
  if (!sets.length) return;
  const sql = `UPDATE users SET ${sets.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...sets.map(k => fields[k]), id);
}

export function verifySecurityAnswers(username, favoriteAnimal, fatherName) {
  const user = getUserByUsername(username);
  if (!user) return null;
  if (
    user.favorite_animal === _normalize(favoriteAnimal) &&
    user.father_name     === _normalize(fatherName)
  ) {
    return user;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   SESSIONS
═══════════════════════════════════════════════════════════════════ */

export function createSession(userId, token, expiresAt) {
  getDb().prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, userId, expiresAt);
}

export function getSessionByToken(token) {
  return getDb().prepare('SELECT * FROM sessions WHERE token = ?').get(token);
}

export function deleteSession(token) {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// Clean up expired sessions on init (best-effort)
try { getDb().exec("DELETE FROM sessions WHERE expires_at < datetime('now')"); } catch (_) {}
