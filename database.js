import Database from 'better-sqlite3'

const db = new Database('motor-videos.db')

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    canal TEXT,
    thumbnail TEXT,
    url TEXT,
    fonte TEXT,
    data TEXT NOT NULL,
    hora TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'agendado',
    criado_em TEXT NOT NULL,
    publicado_em TEXT
  )
`)

console.log('🗄️ Banco SQLite iniciado')

export default db