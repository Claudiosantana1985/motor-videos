import db from '../database.js'

export function obterContaTikTok() {
  const conta = db
    .prepare(`
      SELECT
        open_id,
        access_token,
        refresh_token,
        access_expires_at,
        refresh_expires_at,
        scope
      FROM tiktok_contas
      LIMIT 1
    `)
    .get()

  if (!conta) {
    throw new Error(
      'Nenhuma conta TikTok conectada.',
    )
  }

  return conta
}
export function accessTokenPrecisaRenovar(conta) {
  if (!conta?.access_expires_at) {
    return true
  }

  const agora = Date.now()

  const expiracao = new Date(
    conta.access_expires_at,
  ).getTime()

  if (Number.isNaN(expiracao)) {
    return true
  }

  // Margem de segurança de 5 minutos
  const margemSeguranca =
    5 * 60 * 1000

  return (
    expiracao - agora <= margemSeguranca
  )
} 

export async function renovarAccessTokenTikTok(conta) {
  if (!conta?.refresh_token) {
    throw new Error(
      'Refresh token do TikTok não encontrado.',
    )
  }

  if (conta.refresh_expires_at) {
  const expiracaoRefresh = new Date(
    conta.refresh_expires_at,
  ).getTime()

  if (
    Number.isNaN(expiracaoRefresh) ||
    expiracaoRefresh <= Date.now()
  ) {
    throw new Error(
      'Refresh token do TikTok expirado. É necessário conectar a conta novamente.',
    )
  }
}

  const clientKey =
    process.env.TIKTOK_CLIENT_KEY

  const clientSecret =
    process.env.TIKTOK_CLIENT_SECRET

  if (!clientKey || !clientSecret) {
    throw new Error(
      'Credenciais do TikTok não configuradas.',
    )
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: conta.refresh_token,
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

  const dados = await response.json()

  if (!response.ok || !dados.access_token) {
    console.error(
      '❌ Erro ao renovar token TikTok:',
      dados,
    )

    throw new Error(
      dados.error_description ||
        dados.error ||
        'Erro ao renovar token do TikTok.',
    )
  }

  const agora = Date.now()

  const accessExpiresAt = new Date(
    agora + dados.expires_in * 1000,
  ).toISOString()

  const refreshExpiresAt = new Date(
    agora + dados.refresh_expires_in * 1000,
  ).toISOString()

  db.prepare(`
    UPDATE tiktok_contas
    SET
      access_token = ?,
      refresh_token = ?,
      access_expires_at = ?,
      refresh_expires_at = ?,
      scope = ?,
      atualizado_em = ?
    WHERE open_id = ?
  `).run(
    dados.access_token,
    dados.refresh_token,
    accessExpiresAt,
    refreshExpiresAt,
    dados.scope || conta.scope,
    new Date().toISOString(),
    conta.open_id,
  )

  console.log(
    '🔄 Access token do TikTok renovado.',
  )

  return {
    ...conta,
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    access_expires_at: accessExpiresAt,
    refresh_expires_at: refreshExpiresAt,
    scope: dados.scope || conta.scope,
  }
}
export async function obterCreatorInfo({
  accessToken,
}) {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type':
          'application/json; charset=UTF-8',
      },
    },
  )

  const data = await response.json()

  if (!response.ok || data?.error?.code !== 'ok') {
    const erro = new Error(
      data?.error?.message ||
        'Erro ao consultar Creator Info do TikTok.',
    )

    erro.codigoTikTok =
      data?.error?.code || null

    erro.statusHttp = response.status
    erro.etapa = 'creator_info'

    throw erro
  }

  return {
    username: data.data.creator_username,
    nickname: data.data.creator_nickname,
    privacyLevels:
      data.data.privacy_level_options || [],
    commentsDisabled:
      data.data.comment_disabled,
    duetDisabled:
      data.data.duet_disabled,
    stitchDisabled:
      data.data.stitch_disabled,
    maxVideoDuration:
      data.data.max_video_post_duration_sec,
  }
}
export async function inicializarPublicacao({
  accessToken,
  titulo,
  videoSize,
  chunkSize,
  totalChunkCount,
  privacidade,
  permitirComentarios,
  permitirDueto,
  permitirStitch,
}) {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type':
          'application/json; charset=UTF-8',
      },

      body: JSON.stringify({
        post_info: {
  title: titulo,
  privacy_level: privacidade,
  disable_comment: !permitirComentarios,
  disable_duet: !permitirDueto,
  disable_stitch: !permitirStitch,
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
      data?.error,
    )

    const erro = new Error(
  data?.error?.message ||
    'TikTok recusou a inicialização da publicação.',
)

erro.codigoTikTok =
  data?.error?.code || null

erro.statusHttp =
  response.status

erro.etapa =
  'inicializacao'

throw erro
  }

  if (!data?.data?.publish_id) {
    throw new Error(
      'TikTok não retornou publish_id.',
    )
  }

  if (!data?.data?.upload_url) {
    const erroUpload = new Error(
  `Erro no upload TikTok. HTTP ${response.status}`,
)

erroUpload.statusHttp =
  response.status

erroUpload.etapa =
  'upload'

throw erroUpload
  }

  console.log('✅ Publicação inicializada no TikTok')
  console.log(
    '🆔 Publish ID:',
    data.data.publish_id,
  )

  return {
    publishId: data.data.publish_id,
    uploadUrl: data.data.upload_url,
  }
}
export async function consultarStatus({
  accessToken,
  publishId,
}) {
  const response = await fetch(
    'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type':
          'application/json; charset=UTF-8',
      },

      body: JSON.stringify({
        publish_id: publishId,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok || data?.error?.code !== 'ok') {
    console.error(
      '❌ Erro ao consultar status TikTok:',
      data?.error,
    )

    const erro = new Error(
  data?.error?.message ||
    'Erro ao consultar status da publicação.',
)

erro.codigoTikTok =
  data?.error?.code || null

erro.statusHttp =
  response.status

erro.etapa =
  'consulta-status'

throw erro
  }

  if (!data?.data?.status) {
    throw new Error(
      'TikTok não retornou o status da publicação.',
    )
  }

  return {
    status: data.data.status,
  }
}
export async function enviarVideo({
  uploadUrl,
  caminhoVideo,
  videoSize,
  chunkSize,
  totalChunkCount,
}) {
  const fs = await import('fs')

  const videoBuffer =
    fs.readFileSync(caminhoVideo)

  let inicio = 0

  for (
    let indice = 0;
    indice < totalChunkCount;
    indice++
  ) {
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

    const response = await fetch(
      uploadUrl,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length':
            String(chunk.length),
          'Content-Range':
            `bytes ${inicio}-${fim}/${videoSize}`,
        },

        body: chunk,
      },
    )

    if (
      response.status !== 206 &&
      response.status !== 201
    ) {
      const erro =
        await response.text()

      console.error(
        '❌ TikTok recusou chunk:',
        response.status,
        erro,
      )

      throw new Error(
        `Erro no upload TikTok. HTTP ${response.status}`,
      )
    }

    console.log(
      `✅ Chunk ${indice + 1} enviado`,
    )

    inicio = fimExclusivo
  }

  console.log(
    '🎉 Upload enviado completamente ao TikTok',
  )

  return {
    sucesso: true,
  }
}