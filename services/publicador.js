import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  obterContaTikTok,
  accessTokenPrecisaRenovar,
  renovarAccessTokenTikTok,
  inicializarPublicacao,
  enviarVideo,
  consultarStatus,
} from './tiktok.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function publicarVideo(item) {
  console.log('')
  console.log('🚀 Iniciando publicação')
  console.log(`🎬 Vídeo: ${item.titulo}`)
  console.log(`🆔 Agendamento: ${item.id}`)

  if (!item.caminhoVideo) {
  throw new Error(
    `Agendamento ${item.id} não possui arquivo de vídeo associado.`,
  )
}

const caminhoVideo = path.resolve(
  __dirname,
  '..',
  item.caminhoVideo,
)

  if (!fs.existsSync(caminhoVideo)) {
    throw new Error(
      `Arquivo de vídeo não encontrado: ${caminhoVideo}`,
    )
  }

  const informacoes = fs.statSync(caminhoVideo)

  const tamanhoBytes = informacoes.size
  const tamanhoMB = tamanhoBytes / 1024 / 1024

  console.log('📁 Arquivo encontrado')
  console.log(`📦 Tamanho: ${tamanhoBytes} bytes`)
  console.log(`📦 Aproximadamente: ${tamanhoMB.toFixed(2)} MB`)

  let conta = obterContaTikTok()

console.log('🔐 Conta TikTok carregada')

if (accessTokenPrecisaRenovar(conta)) {
  console.log(
    '🔄 Access token próximo da expiração. Renovando...',
  )

  conta =
    await renovarAccessTokenTikTok(conta)

  console.log(
    '✅ Access token do TikTok atualizado',
  )
} else {
  console.log(
    '✅ Access token do TikTok ainda é válido',
  )
}

const chunkSize = 10_000_000

const totalChunkCount = Math.floor(
  tamanhoBytes / chunkSize,
)

console.log('📦 Preparação TikTok concluída')
console.log(`🧩 Chunks previstos: ${totalChunkCount}`)

const {
  publishId,
  uploadUrl,
} = await inicializarPublicacao({
  accessToken: conta.access_token,
  titulo: item.titulo,
  videoSize: tamanhoBytes,
  chunkSize,
  totalChunkCount,
})

console.log('✅ Sessão de publicação criada')
console.log(`🆔 Publish ID: ${publishId}`)
console.log('📤 Upload URL recebida com segurança')

await enviarVideo({
  uploadUrl,
  caminhoVideo,
  videoSize: tamanhoBytes,
  chunkSize,
  totalChunkCount,
})

console.log('✅ Vídeo enviado ao TikTok')
console.log('⏳ Aguardando processamento do TikTok')

let status = null
const maxTentativas = 30

for (
  let tentativa = 1;
  tentativa <= maxTentativas;
  tentativa++
) {
  const resultadoStatus =
    await consultarStatus({
      accessToken: conta.access_token,
      publishId,
    })

  status = resultadoStatus.status

  console.log(
    `📊 Status TikTok (${tentativa}/${maxTentativas}): ${status}`,
  )

  if (status === 'PUBLISH_COMPLETE') {
    console.log(
      '🎉 TikTok confirmou a publicação',
    )

    break
  }

  if (status === 'FAILED') {
    throw new Error(
      'TikTok informou falha na publicação.',
    )
  }

  await new Promise((resolve) =>
    setTimeout(resolve, 5000),
  )
}

if (status !== 'PUBLISH_COMPLETE') {
  throw new Error(
    `TikTok não confirmou a publicação no tempo esperado. Último status: ${status}`,
  )
}
return {
  sucesso: true,
  plataforma: 'tiktok',
  publishId,
  status,
  publicadoEm: new Date().toISOString(),
}
}