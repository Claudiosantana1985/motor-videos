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
// Migração: arquivo associado ao agendamento
const colunasAgendamentos = db
  .prepare(`PRAGMA table_info(agendamentos)`)
  .all()

const possuiCaminhoVideo =
  colunasAgendamentos.some(
    (coluna) => coluna.name === 'caminho_video',
  )

if (!possuiCaminhoVideo) {
  db.exec(`
    ALTER TABLE agendamentos
    ADD COLUMN caminho_video TEXT
  `)

  console.log(
    '🗄️ Coluna caminho_video adicionada aos agendamentos',
  )
}

const possuiPublishId =
  colunasAgendamentos.some(
    (coluna) => coluna.name === 'publish_id',
  )

if (!possuiPublishId) {
  db.exec(`
    ALTER TABLE agendamentos
    ADD COLUMN publish_id TEXT
  `)

  console.log(
    '🗄️ Coluna publish_id adicionada aos agendamentos',
  )
}
const possuiUltimoErro =
  colunasAgendamentos.some(
    (coluna) => coluna.name === 'ultimo_erro',
  )

if (!possuiUltimoErro) {
  db.exec(`
    ALTER TABLE agendamentos
    ADD COLUMN ultimo_erro TEXT
  `)

  console.log(
    '🗄️ Coluna ultimo_erro adicionada aos agendamentos',
  )
}
const possuiTentativasPublicacao =
  colunasAgendamentos.some(
    (coluna) =>
      coluna.name === 'tentativas_publicacao',
  )

if (!possuiTentativasPublicacao) {
  db.exec(`
    ALTER TABLE agendamentos
    ADD COLUMN tentativas_publicacao INTEGER NOT NULL DEFAULT 0
  `)

  console.log(
    '🗄️ Coluna tentativas_publicacao adicionada aos agendamentos',
  )
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tiktok_contas (
    open_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    access_expires_at TEXT NOT NULL,
    refresh_expires_at TEXT NOT NULL,
    scope TEXT,
    atualizado_em TEXT NOT NULL
  )
`) 
console.log('🗄️ Banco SQLite iniciado')

export default db