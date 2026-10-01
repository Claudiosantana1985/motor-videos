import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

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