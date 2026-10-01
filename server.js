import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import db from './database.js'
import { publicarVideo } from './services/publicador.js'
dotenv.config()

const app = express()
const PORT = 3001

const totalAgendamentos = db
  .prepare('SELECT COUNT(*) AS total FROM agendamentos')
  .get()

console.log(
  `📅 Agendamentos no banco: ${totalAgendamentos.total}`,
)

app.use(cors())
app.use(express.json())
app.post('/api/agendamentos', (req, res) => {
  try {
    const agendamento = req.body

    if (
      !agendamento?.id ||
      !agendamento?.video?.id ||
      !agendamento?.video?.titulo ||
      !agendamento?.data ||
      !agendamento?.hora
    ) {
      return res.status(400).json({
        error: 'Dados do agendamento incompletos.',
      })
    }

    const comando = db.prepare(`
      INSERT INTO agendamentos (
        id,
        video_id,
        titulo,
        canal,
        thumbnail,
        url,
        fonte,
        data,
        hora,
        status,
        criado_em,
        publicado_em
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    comando.run(
      agendamento.id,
      agendamento.video.id,
      agendamento.video.titulo,
      agendamento.video.canal || null,
      agendamento.video.thumbnail || null,
      agendamento.video.url || null,
      agendamento.video.fonte || null,
      agendamento.data,
      agendamento.hora,
      agendamento.status || 'agendado',
      agendamento.criadoEm || new Date().toISOString(),
      null,
    )

    res.status(201).json({
      mensagem: 'Agendamento salvo.',
      id: agendamento.id,
    })
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error)

    res.status(500).json({
      error: 'Erro ao salvar agendamento.',
    })
  }
})
app.get('/api/agendamentos', (req, res) => {
  try {
    const registros = db
      .prepare(`
        SELECT *
        FROM agendamentos
        ORDER BY data ASC, hora ASC
      `)
      .all()

    const agendamentos = registros.map((registro) => ({
      id: registro.id,

      video: {
        id: registro.video_id,
        titulo: registro.titulo,
        canal: registro.canal,
        thumbnail: registro.thumbnail,
        url: registro.url,
        fonte: registro.fonte,
      },

      data: registro.data,
      hora: registro.hora,
      status: registro.status,
      criadoEm: registro.criado_em,
      publicadoEm: registro.publicado_em,
    }))

    res.json({
      total: agendamentos.length,
      agendamentos,
    })
  } catch (error) {
    console.error(
      'Erro ao buscar agendamentos:',
      error,
    )

    res.status(500).json({
      error: 'Erro ao buscar agendamentos.',
    })
  }
})
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q?.trim()

    if (!query) {
      return res.status(400).json({
        error: 'Informe um termo para pesquisa.',
      })
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({
        error: 'YOUTUBE_API_KEY não configurada.',
      })
    }

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '12',
      key: process.env.YOUTUBE_API_KEY,
    })

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro YouTube:', data)

      return res.status(response.status).json({
        error: 'Erro ao pesquisar no YouTube.',
        details: data?.error?.message,
      })
    }

    const videos = data.items.map((item) => ({
      id: item.id.videoId,
      titulo: item.snippet.title,
      descricao: item.snippet.description,
      canal: item.snippet.channelTitle,
      publicadoEm: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      fonte: 'YouTube',
    }))

    res.json({
      total: videos.length,
      videos,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: 'Erro interno do servidor.',
    })
  }
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
  })
})
function verificarAgendamentos() {
  try {
    const agora = new Date()

    const agendamentos = db
      .prepare(`
        SELECT id, data, hora
        FROM agendamentos
        WHERE status = 'agendado'
      `)
      .all()

    for (const agendamento of agendamentos) {
      const dataAgendada = new Date(
        `${agendamento.data}T${agendamento.hora}`,
      )

      if (dataAgendada <= agora) {
        db.prepare(`
          UPDATE agendamentos
          SET status = 'na-fila'
          WHERE id = ?
        `).run(agendamento.id)

        console.log(
          `⏳ Agendamento enviado para fila: ${agendamento.id}`,
        )
      }
    }
  } catch (error) {
    console.error(
      'Erro ao verificar agendamentos:',
      error,
    )
  }
}

verificarAgendamentos()

setInterval(
  verificarAgendamentos,
  10000,
) 
async function processarFilaPublicacao() {
  try {
    const itensNaFila = db
      .prepare(`
        SELECT id, titulo
        FROM agendamentos
        WHERE status = 'na-fila'
      `)
      .all()
for (const item of itensNaFila) {
  try {
    const alteracao = db.prepare(`
      UPDATE agendamentos
      SET status = 'publicando'
      WHERE id = ?
        AND status = 'na-fila'
    `).run(item.id)

    if (alteracao.changes === 0) {
      continue
    }

    console.log(
      `📤 Item marcado como PUBLICANDO: ${item.id}`,
    )

    const resultado = await publicarVideo(item)

        if (!resultado.sucesso) {
          console.error(
            `❌ Falha na publicação: ${item.id}`,
          )

          continue
        }

        db.prepare(`
          UPDATE agendamentos
          SET
            status = 'publicado',
            publicado_em = ?
          WHERE id = ?
        `).run(
          resultado.publicadoEm,
          item.id,
        )

        console.log(
          `💾 Publicação registrada no banco: ${item.id}`,
        )
      } catch (error) {
  console.error(
    `❌ Erro ao publicar ${item.id}:`,
    error,
  )

  db.prepare(`
    UPDATE agendamentos
    SET status = 'erro'
    WHERE id = ?
  `).run(item.id)

  console.log(
    `⚠️ Publicação marcada como ERRO: ${item.id}`,
  )
}
    }
  } catch (error) {
    console.error(
      'Erro ao processar fila:',
      error,
    )
  }
}

processarFilaPublicacao()

setInterval(
  processarFilaPublicacao,
  10000,
)
app.listen(PORT, () => {
  console.log('')
  console.log('🚀 Motor Videos API iniciada')
  console.log(`📡 http://localhost:${PORT}`)
  console.log(
    `🔑 YouTube API: ${
      process.env.YOUTUBE_API_KEY ? 'configurada' : 'NÃO CONFIGURADA'
    }`,
  )
  console.log('')
})