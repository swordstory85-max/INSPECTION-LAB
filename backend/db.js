const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data.sqlite");
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
  CREATE TABLE IF NOT EXISTS tv (
    serial_number TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS inspection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tv_serial_number TEXT NOT NULL REFERENCES tv(serial_number),
    model_name TEXT NOT NULL,
    inspected_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    overall_result TEXT NOT NULL CHECK (overall_result IN ('OK', 'NG'))
  );

  CREATE TABLE IF NOT EXISTS screen_result (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL REFERENCES inspection(id),
    screen TEXT NOT NULL CHECK (screen IN ('White', 'Red', 'Green', 'Blue', 'Black')),
    result TEXT NOT NULL CHECK (result IN ('OK', 'NG')),
    defect_types TEXT NOT NULL DEFAULT '[]',
    note TEXT,
    UNIQUE (inspection_id, screen)
  );

  CREATE TABLE IF NOT EXISTS screen_note_correction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL REFERENCES inspection(id),
    screen TEXT NOT NULL CHECK (screen IN ('White', 'Red', 'Green', 'Blue', 'Black')),
    previous_note TEXT NOT NULL,
    new_note TEXT NOT NULL,
    corrected_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS tv_deletion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tv_serial_number TEXT NOT NULL UNIQUE REFERENCES tv(serial_number),
    deleted_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

module.exports = db;
