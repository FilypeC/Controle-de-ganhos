import { DatabaseSync } from 'node:sqlite';

export function createDatabase(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS entregas (
      data DATE NOT NULL,
      quantidade_entregas INTEGER NOT NULL CHECK (quantidade_entregas >= 0),
      saida TIME,
      nota TEXT
    );
    CREATE TABLE IF NOT EXISTS ganho_diario (
      data DATE PRIMARY KEY,
      quantidade_entregas INTEGER NOT NULL,
      ganho_diario REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contas (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
      senha_hash TEXT NOT NULL,
      tipo_conta TEXT NOT NULL CHECK (length(trim(tipo_conta)) > 0)
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      token_hash TEXT PRIMARY KEY NOT NULL,
      conta_id TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    )
  `);
  database.exec('PRAGMA foreign_keys = ON');
  database.prepare('DELETE FROM sessoes WHERE expires_at <= ?').run(new Date().toISOString());
  return database;
}
