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
export async function inicializarPublicacao({
  accessToken,
  titulo,
  videoSize,
  chunkSize,
  totalChunkCount,
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
      data?.error,
    )

    throw new Error(
      data?.error?.message ||
        'TikTok recusou a inicialização da publicação.',
    )
  }

  if (!data?.data?.publish_id) {
    throw new Error(
      'TikTok não retornou publish_id.',
    )
  }

  if (!data?.data?.upload_url) {
    throw new Error(
      'TikTok não retornou upload_url.',
    )
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

    throw new Error(
      data?.error?.message ||
        'Erro ao consultar status da publicação.',
    )
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