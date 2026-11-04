// Accès base de données (SQLite intégré à Node, aucune dépendance à installer)
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(process.env.DB_FILE || path.join(dir, 'billet.db'));

// Création automatique des tables au démarrage
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL, prenom TEXT NOT NULL, tel TEXT NOT NULL,
    supprime INTEGER NOT NULL DEFAULT 0,
    date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS vols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compagnie TEXT NOT NULL, origine TEXT NOT NULL, destination TEXT NOT NULL,
    prix REAL NOT NULL,
    supprime INTEGER NOT NULL DEFAULT 0,
    date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    vol_id INTEGER NOT NULL REFERENCES vols(id),
    date_r TEXT NOT NULL,
    supprime INTEGER NOT NULL DEFAULT 0,
    date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const fetchAll = (sql, params = []) => db.prepare(sql).all(...params);
const fetchOne = (sql, params = []) => db.prepare(sql).get(...params) || null;
const run = (sql, params = []) => db.prepare(sql).run(...params);

const TABLES = ['clients', 'vols', 'reservations'];
function softDelete(table, id) {
  if (!TABLES.includes(table)) throw new Error('Table invalide');
  return run(`UPDATE ${table} SET supprime = 1 WHERE id = ? AND supprime = 0`, [id]).changes > 0;
}

module.exports = { fetchAll, fetchOne, run, softDelete };
