import express from 'express'
import crypto from 'crypto'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import db from './database.js'
import path from 'path'
import fs from 'fs'
import { publicarVideo } from './services/publicador.js'
import {
  obterContaTikTok,
  accessTokenPrecisaRenovar,
  renovarAccessTokenTikTok,
  consultarStatus,
} from './services/tiktok.js'

const PUBLICACAO_REAL_ATIVA =  false
dotenv.config()

// configuração do multer para salvar vídeos enviados

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'videos/')
  },

  filename: (req, file, cb) => {
  const extensao = path
    .extname(file.originalname)
    .toLowerCase()

  const nomeUnico =
    `${Date.now()}-${crypto.randomUUID()}${extensao}`

  cb(null, nomeUnico)
},
})

const extensoesPermitidas = new Set([
  '.mp4',
  '.mov',
  '.webm',
])

// Limite de tamanho do arquivo: 500 MB

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {
    const extensao = path
      .extname(file.originalname)
      .toLowerCase()

    if (!extensoesPermitidas.has(extensao)) {
      return cb(
        new Error(
          'Formato de vídeo não permitido.',
        ),
      )
    }

    cb(null, true)
  },

  limits: {
    fileSize: 500 * 1024 * 1024,
  },
})

const app = express()
const PORT = 3001
const tiktokOAuthSessions = new Map()
const totalAgendamentos = db
  .prepare('SELECT COUNT(*) AS total FROM agendamentos')
  .get()

console.log(
  `📅 Agendamentos no banco: ${totalAgendamentos.total}`,
)

app.use(cors())
app.use(express.json())

// Inicia o processo de autorização com o TikTok
app.get('/auth/tiktok', (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = process.env.TIKTOK_REDIRECT_URI

  if (!clientKey || !redirectUri) {
    return res.status(500).json({
      error: 'Configuração do TikTok incompleta.',
    })
  }

  const state = crypto.randomBytes(16).toString('hex')

  const codeVerifier = crypto
    .randomBytes(32)
    .toString('hex')

  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('hex')

  // Guarda temporariamente os dados necessários
  // para validar o retorno do TikTok
  tiktokOAuthSessions.set(state, {
    codeVerifier,
    criadoEm: Date.now(),
  })

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: 'user.info.basic,video.publish',
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const urlAutorizacao =
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`

  console.log('🔐 Iniciando autorização TikTok')

  res.redirect(urlAutorizacao)
})

// Rota para verificar status dos tokens do TikTok

app.get('/api/tiktok/token-status', (req, res) => {
  try {
    const conta = db
      .prepare(`
        SELECT
          open_id,
          access_expires_at,
          refresh_expires_at
        FROM tiktok_contas
        LIMIT 1
      `)
      .get()

    if (!conta) {
      return res.status(404).json({
        error: 'Nenhuma conta TikTok conectada.',
      })
    }

    res.json({
      accessExpiresAt:
        conta.access_expires_at,
      refreshExpiresAt:
        conta.refresh_expires_at,
      agora: new Date().toISOString(),
    })
  } catch (error) {
    console.error(
      'Erro ao consultar tokens:',
      error,
    )

    res.status(500).json({
      error:
        'Erro ao consultar status dos tokens.',
    })
  }
})

// Recebe o retorno do TikTok
app.get('/auth/tiktok/callback', async (req, res) => {
  const {
    code,
    state,
    error,
    error_description: errorDescription,
  } = req.query

  if (error) {
    console.error('❌ TikTok recusou autorização:', {
      error,
      errorDescription,
    })

    return res.status(400).send(
      `TikTok não autorizou: ${errorDescription || error}`,
    )
  }

  if (!code || !state) {
    return res.status(400).send(
      'Callback do TikTok incompleto.',
    )
  }

  const sessao = tiktokOAuthSessions.get(state)

  if (!sessao) {
    return res.status(400).send(
      'State inválido ou sessão de autorização expirada.',
    )
  }

  console.log('✅ Callback recebido do TikTok')
console.log('🔒 State validado com sucesso')

try {
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    code_verifier: sessao.codeVerifier,
  })

  const response = await fetch(
    'https://open.tiktokapis.com/v2/oauth/token/',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body,
    },
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('❌ Erro ao obter token do TikTok:', data)

    return res.status(500).send(
      'Erro ao obter autorização do TikTok.',
    )
  }

  // O state não poderá ser reutilizado.
  tiktokOAuthSessions.delete(state)

  const agora = new Date()

const accessExpiresAt = new Date(
  agora.getTime() + data.expires_in * 1000,
).toISOString()

const refreshExpiresAt = new Date(
  agora.getTime() + data.refresh_expires_in * 1000,
).toISOString()

db.prepare(`
  INSERT INTO tiktok_contas (
    open_id,
    access_token,
    refresh_token,
    access_expires_at,
    refresh_expires_at,
    scope,
    atualizado_em
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)

  ON CONFLICT(open_id) DO UPDATE SET
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    access_expires_at = excluded.access_expires_at,
    refresh_expires_at = excluded.refresh_expires_at,
    scope = excluded.scope,
    atualizado_em = excluded.atualizado_em
`).run(
  data.open_id,
  data.access_token,
  data.refresh_token,
  accessExpiresAt,
  refreshExpiresAt,
  data.scope,
  agora.toISOString(),
)

console.log('🔑 Access token recebido')
console.log('🔄 Refresh token recebido')
console.log('💾 Conta TikTok salva no banco')
console.log('📋 Scopes:', data.scope)

res.send(
  'TikTok conectado ao Motor Videos com sucesso.',
)
} catch (error) {
  console.error(
    '❌ Erro na troca do código TikTok:',
    error,
  )

  res.status(500).send(
    'Erro interno durante autorização do TikTok.',
  )
}
})
app.post('/api/agendamentos', (req, res) => {
  try {
    const agendamento = req.body

    // 1. Validação dos dados obrigatórios
    if (
      !agendamento?.id ||
      !agendamento?.video?.id ||
      !agendamento?.video?.titulo ||
      !agendamento?.data ||
      !agendamento?.hora ||
      !agendamento?.caminhoVideo
    ) {
      return res.status(400).json({
        error: 'Dados do agendamento incompletos.',
      })
    }

    // 2. Validação da data e hora
    const dataAgendada = new Date(
      `${agendamento.data}T${agendamento.hora}`,
    )

    if (Number.isNaN(dataAgendada.getTime())) {
      return res.status(400).json({
        error: 'Data ou hora inválida.',
      })
    }

    // 3. Impede agendamento no passado
    const agora = new Date()

const antecedenciaMinima =
  2 * 60 * 1000

const horarioMinimo =
  new Date(
    agora.getTime() + antecedenciaMinima,
  )

if (dataAgendada < horarioMinimo) {
  return res.status(400).json({
    error:
      'O agendamento precisa ser feito com pelo menos 2 minutos de antecedência.',
  })
}

    // 4. Confirma que o arquivo realmente existe
    const caminhoCompleto = path.resolve(
      agendamento.caminhoVideo,
    )

    if (!fs.existsSync(caminhoCompleto)) {
      return res.status(400).json({
        error: 'Arquivo de vídeo não encontrado.',
      })
    }

    // 5. Salva somente depois de todas as validações
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
        publicado_em,
        caminho_video
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      agendamento.caminhoVideo,
    )

    res.status(201).json({
      mensagem: 'Agendamento salvo.',
      id: agendamento.id,
    })
  } catch (error) {
    console.error(
      'Erro ao salvar agendamento:',
      error,
    )

    res.status(500).json({
      error: 'Erro ao salvar agendamento.',
    })
  }
})

app.get('/api/videos', (req, res) => {
  try {
    const pastaVideos = path.resolve('videos')

    const arquivos = fs.readdirSync(pastaVideos)

    const extensoesPermitidas = [
      '.mp4',
      '.mov',
      '.webm',
    ]

    const videos = arquivos
      .filter((arquivo) => {
        const extensao = path
          .extname(arquivo)
          .toLowerCase()

        return extensoesPermitidas.includes(extensao)
      })
      .map((arquivo) => ({
        nomeArquivo: arquivo,
        caminhoVideo: `videos/${arquivo}`,
      }))

    res.json({
      total: videos.length,
      videos,
    })
  } catch (error) {
    console.error(
      'Erro ao listar vídeos:',
      error,
    )

    res.status(500).json({
      erro: 'Erro ao listar vídeos.',
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
      caminhoVideo: registro.caminho_video,
      ultimoErro: registro.ultimo_erro,
      tentativasPublicacao:
        registro.tentativas_publicacao,
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
    // Trava geral de segurança
    if (!PUBLICACAO_REAL_ATIVA) {
      return
    }

    const agora = new Date()

    const agendamentos = db
      .prepare(`
        SELECT id, data, hora
        FROM agendamentos
        WHERE status = 'agendado'
          AND caminho_video IS NOT NULL
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
            AND status = 'agendado'
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
recuperarPublicacoesInterrompidas()


setInterval(
  recuperarPublicacoesInterrompidas,
  30000,
)

verificarAgendamentos()

setInterval(
  verificarAgendamentos,
  10000,
)

async function processarFilaPublicacao() {
  try { 
        if (!PUBLICACAO_REAL_ATIVA) {
      return
    }
    const itensNaFila = db
  .prepare(`
    SELECT
      id,
      titulo,
      caminho_video AS caminhoVideo
    FROM agendamentos
    WHERE status = 'na-fila'
  `)
  .all()
for (const item of itensNaFila) {
  try {
    const alteracao = db.prepare(`
  UPDATE agendamentos
  SET
    status = 'publicando',
    ultimo_erro = NULL,
    tentativas_publicacao =
      tentativas_publicacao + 1
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

  const mensagemErro =
  error instanceof Error
    ? error.message
    : String(error)

db.prepare(`
  UPDATE agendamentos
  SET
    status = 'erro',
    ultimo_erro = ?
  WHERE id = ?
`).run(
  mensagemErro,
  item.id,
)

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

async function recuperarPublicacoesInterrompidas() {
  try {
    const publicacoesInterrompidas = db
      .prepare(`
        SELECT
          id,
          titulo,
          publish_id AS publishId
        FROM agendamentos
        WHERE status = 'publicando'
      `)
      .all()

    if (publicacoesInterrompidas.length === 0) {
      console.log(
        '✅ Nenhuma publicação interrompida encontrada',
      )
      return
    }

    console.log(
      `🔎 Publicações interrompidas encontradas: ${publicacoesInterrompidas.length}`,
    )

    let conta = obterContaTikTok()

    if (accessTokenPrecisaRenovar(conta)) {
      console.log(
        '🔄 Renovando token antes da recuperação...',
      )

      conta =
        await renovarAccessTokenTikTok(conta)
    }

    for (const item of publicacoesInterrompidas) {
      if (!item.publishId) {
        console.error(
          `⚠️ ${item.id} está PUBLICANDO, mas não possui publish_id. Não será republicado automaticamente.`,
        )

        continue
      }

      try {
        const resultado =
          await consultarStatus({
            accessToken: conta.access_token,
            publishId: item.publishId,
          })

        console.log(
          `🔎 ${item.id} → TikTok: ${resultado.status}`,
        )

        if (
          resultado.status ===
          'PUBLISH_COMPLETE'
        ) {
          const publicadoEm =
            new Date().toISOString()

          db.prepare(`
            UPDATE agendamentos
            SET
              status = 'publicado',
              publicado_em = ?
            WHERE id = ?
          `).run(
            publicadoEm,
            item.id,
          )

          console.log(
            `✅ Publicação recuperada como PUBLICADO: ${item.id}`,
          )

          continue
        }

        if (resultado.status === 'FAILED') {
          db.prepare(`
            UPDATE agendamentos
            SET status = 'erro'
            WHERE id = ?
          `).run(item.id)

          console.log(
            `❌ Publicação recuperada como ERRO: ${item.id}`,
          )

          continue
        }

        console.log(
          `⏳ ${item.id} continua sendo processado pelo TikTok`,
        )
      } catch (error) {
        console.error(
          `❌ Erro ao recuperar ${item.id}:`,
          error,
        )
      }
    }
  } catch (error) {
    console.error(
      '❌ Erro na recuperação de publicações:',
      error,
    )
  }
}

setInterval(
  processarFilaPublicacao,
  10000,
)
app.get('/api/tiktok/creator-info', async (req, res) => {
  try {
    const conta = db
      .prepare(`
        SELECT access_token
        FROM tiktok_contas
        LIMIT 1
      `)
      .get()

    if (!conta) {
      return res.status(404).json({
        error: 'Nenhuma conta TikTok conectada.',
      })
    }

    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conta.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      },
    )

    const data = await response.json()

    if (!response.ok || data?.error?.code !== 'ok') {
      console.error(
        '❌ Erro ao consultar creator info:',
        data?.error,
      )

      return res.status(502).json({
        error: 'Erro ao consultar conta TikTok.',
        tiktok: data?.error,
      })
    }

    console.log('✅ Creator Info recebido do TikTok')

    res.json({
      creator: {
        username: data.data.creator_username,
        nickname: data.data.creator_nickname,
        privacyLevels:
          data.data.privacy_level_options,
        commentsDisabled:
          data.data.comment_disabled,
        duetDisabled:
          data.data.duet_disabled,
        stitchDisabled:
          data.data.stitch_disabled,
        maxVideoDuration:
          data.data.max_video_post_duration_sec,
      },
    })
  } catch (error) {
    console.error(
      '❌ Erro ao consultar TikTok:',
      error,
    )

    res.status(500).json({
      error: 'Erro interno ao consultar TikTok.',
    })
  }
})

app.get('/api/tiktok/teste-init-publicacao', async (req, res) => {
  try {
    const conta = db
      .prepare(`
        SELECT access_token
        FROM tiktok_contas
        LIMIT 1
      `)
      .get()

    if (!conta) {
      return res.status(404).json({
        error: 'Nenhuma conta TikTok conectada.',
      })
    }

    const videoSize = 69295769
    const chunkSize = 10000000
    const totalChunkCount = Math.floor(
      videoSize / chunkSize,
    )

    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${conta.access_token}`,
          'Content-Type':
            'application/json; charset=UTF-8',
        },

        body: JSON.stringify({
          post_info: {
            title: 'Teste Motor Videos',
            privacy_level: 'SELF_ONLY',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },

          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: chunkSize,
            total_chunk_count: totalChunkCount,
          },
        }),
      },
    )

    const data = await response.json()

    if (!response.ok || data?.error?.code !== 'ok') {
      console.error(
        '❌ TikTok recusou inicialização:',
        data,
      )

      return res.status(502).json({
        error: 'TikTok recusou a inicialização.',
        tiktok: data?.error,
      })
    }

    console.log('✅ Publicação inicializada no TikTok')
    console.log(
      '🆔 Publish ID:',
      data.data.publish_id,
    )

    // exibimos upload_url no terminal.
    console.log('📤 Upload URL recebida')

const publishId = data.data.publish_id
const uploadUrl = data.data.upload_url

if (!uploadUrl) {
  return res.status(502).json({
    error: 'TikTok não retornou upload_url.',
  })
}

console.log('📦 Iniciando upload do arquivo')

const fs = await import('fs')

const caminhoVideo =
  './videos/teste.mp4'

const videoBuffer =
  fs.readFileSync(caminhoVideo)

let inicio = 0

for (let indice = 0; indice < totalChunkCount; indice++) {
  const ultimoChunk =
    indice === totalChunkCount - 1

  const fimExclusivo = ultimoChunk
    ? videoSize
    : inicio + chunkSize

  const chunk = videoBuffer.subarray(
    inicio,
    fimExclusivo,
  )

  const fim = fimExclusivo - 1

  console.log(
    `📤 Enviando chunk ${indice + 1}/${totalChunkCount}`,
  )

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',

    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(chunk.length),
      'Content-Range':
        `bytes ${inicio}-${fim}/${videoSize}`,
    },

    body: chunk,
  })

  if (
    uploadResponse.status !== 206 &&
    uploadResponse.status !== 201
  ) {
    const erroUpload =
      await uploadResponse.text()

    console.error(
      '❌ Erro no upload:',
      uploadResponse.status,
      erroUpload,
    )

    return res.status(502).json({
      error: 'Erro ao enviar vídeo ao TikTok.',
      status: uploadResponse.status,
    })
  }

  console.log(
    `✅ Chunk ${indice + 1} enviado`,
  )

  inicio = fimExclusivo
}

console.log('🎉 Upload completo enviado ao TikTok')

res.json({
  sucesso: true,
  publishId,
  uploadCompleto: true,
})
  } catch (error) {
    console.error(
      '❌ Erro ao inicializar publicação:',
      error,
    )

    res.status(500).json({
      error: 'Erro interno.',
    })
  }
})

app.get('/api/tiktok/status-teste', async (req, res) => {
  try {
    const conta = db
      .prepare(`
        SELECT access_token
        FROM tiktok_contas
        LIMIT 1
      `)
      .get()

    if (!conta) {
      return res.status(404).json({
        error: 'Nenhuma conta TikTok conectada.',
      })
    }

    const publishId =
      'v_pub_file~v2-1.7692140681405663284'

    const response = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${conta.access_token}`,
          'Content-Type':
            'application/json; charset=UTF-8',
        },

        body: JSON.stringify({
          publish_id: publishId,
        }),
      },
    )

    const resultado = await response.json()

    console.log('📊 Status TikTok:', resultado)

    res.status(response.status).json(resultado)

  } catch (error) {
    console.error(
      '❌ Erro consultando status TikTok:',
      error,
    )

    res.status(500).json({
      error: 'Erro interno.',
    })
  }
})


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

// Rota para upload de vídeos

app.post(
  '/api/videos/upload',
  upload.single('video'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          erro: 'Nenhum arquivo de vídeo foi enviado.',
        })
      }

      const caminhoVideo =
        `videos/${req.file.filename}`

      console.log(
        `📥 Vídeo recebido: ${caminhoVideo}`,
      )

      res.json({
        sucesso: true,
        arquivo: {
          nomeOriginal: req.file.originalname,
          nomeArquivo: req.file.filename,
          caminhoVideo,
          tamanho: req.file.size,
          tipo: req.file.mimetype,
        },
      })
    } catch (error) {
      console.error(
        'Erro no upload do vídeo:',
        error,
      )

      res.status(500).json({
        erro: 'Erro ao receber o vídeo.',
      })
    }
  },
)