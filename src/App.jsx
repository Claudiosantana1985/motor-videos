import { useState } from 'react'
import './App.css'
import AgendamentoModal from './AgendamentoModal'

function App() {
  const [busca, setBusca] = useState('')
  const [videos, setVideos] = useState([])
  const [tela, setTela] = useState('buscar')
  const [videoParaAgendar, setVideoParaAgendar] = useState(null)

   const [agendamentos, setAgendamentos] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem('motor-videos-agendamentos'),
    ) || []
  } catch {
    return []
  }
})

  const [biblioteca, setBiblioteca] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('motor-videos-biblioteca'),
      ) || []
    } catch {
      return []
    }
  })

  async function buscarVideos() {
    if (!busca.trim()) return

    try {
      const response = await fetch(
        `http://localhost:3001/api/search?q=${encodeURIComponent(busca)}`,
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.details ||
          data.error ||
          'Erro na busca',
        )
      }

      setVideos(data.videos)
    } catch (error) {
      console.error(error)
      alert(`Erro ao buscar vídeos: ${error.message}`)
    }
  }

  function adicionarBiblioteca(video) {
    if (biblioteca.some((item) => item.id === video.id)) {
      alert('Este vídeo já está na biblioteca!')
      return
    }

    const novaBiblioteca = [...biblioteca, video]

    setBiblioteca(novaBiblioteca)

    localStorage.setItem(
      'motor-videos-biblioteca',
      JSON.stringify(novaBiblioteca),
    )

    alert('Vídeo adicionado à biblioteca!')
  }

  function removerBiblioteca(videoId) {
    const novaBiblioteca = biblioteca.filter(
      (video) => video.id !== videoId,
    )

    setBiblioteca(novaBiblioteca)

    localStorage.setItem(
      'motor-videos-biblioteca',
      JSON.stringify(novaBiblioteca),
    )
  }

  return (
    <div className="app">

      {/* MENU LATERAL */}

      <aside className="sidebar">
        <div className="logo">
          <span>▶</span>

          <div>
            <strong>Motor de Vídeos</strong>
            <small>Content Automation</small>
          </div>
        </div>

        <nav>
          <button
            className={tela === 'buscar' ? 'active' : ''}
            onClick={() => setTela('buscar')}
          >
            🔎 Buscar vídeos
          </button>

          <button
            className={tela === 'biblioteca' ? 'active' : ''}
            onClick={() => setTela('biblioteca')}
          >
            📚 Biblioteca
          </button>

<button
  className={tela === 'agendamentos' ? 'active' : ''}
  onClick={() => setTela('agendamentos')}
>
  📅 Agendamentos
</button>
          <button>
            📊 Histórico
          </button>

          <button>
            ⚙️ Configurações
          </button>
        </nav>

        <div className="status">
          <span className="statusDot"></span>
          Sistema local
        </div>
      </aside>


      {/* CONTEÚDO PRINCIPAL */}

      <main className="content">

        <header>
          <div>
            <p className="eyebrow">
              PAINEL DE CONTEÚDO
            </p>

            <h1>Motor de Vídeos</h1>

            <p>
              Encontre, organize e programe seus conteúdos
              em um único lugar.
            </p>
          </div>

          <div className="tiktokStatus">
            <span></span>
            TikTok não conectado
          </div>
        </header>


        {/* TELA BUSCAR */}

        {tela === 'buscar' && (
          <>
            <section className="searchCard">
              <div>
                <h2>Buscar conteúdo</h2>

                <p>
                  Encontre vídeos para adicionar à sua
                  biblioteca.
                </p>
              </div>

              <div className="searchBar">

                <input
                  value={busca}
                  onChange={(e) =>
                    setBusca(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      buscarVideos()
                    }
                  }}
                  placeholder="Ex.: carros antigos, curiosidades, tecnologia..."
                />

                <select defaultValue="youtube">
                  <option value="youtube">
                    YouTube
                  </option>

                  <option value="biblioteca">
                    Biblioteca própria
                  </option>
                </select>

                <button onClick={buscarVideos}>
                  Buscar
                </button>

              </div>
            </section>


            {/* INDICADORES */}

            <section className="stats">

              <article>
                <span>📚</span>

                <div>
                  <strong>
                    {biblioteca.length}
                  </strong>

                  <small>
                    Na biblioteca
                  </small>
                </div>
              </article>


              <article>
                <span>📅</span>

                <div>
                  <strong>{agendamentos.length}</strong>

                  <small>
                    Agendados
                  </small>
                </div>
              </article>


              <article>
                <span>🚀</span>

                <div>
                  <strong>0</strong>

                  <small>
                    Publicados
                  </small>
                </div>
              </article>


              <article>
                <span>⏳</span>

                <div>
                  <strong>0</strong>

                  <small>
                    Na fila
                  </small>
                </div>
              </article>

            </section>


            {/* RESULTADOS */}

            <section className="results">

              <div className="sectionTitle">
                <div>
                  <h2>Resultados</h2>

                  <p>
                    {videos.length
                      ? `${videos.length} vídeos encontrados`
                      : 'Faça uma busca para começar'}
                  </p>
                </div>
              </div>


              {videos.length === 0 ? (

                <div className="empty">

                  <div>🎬</div>

                  <h3>
                    Seu motor está pronto
                  </h3>

                  <p>
                    Digite um assunto acima e pressione
                    Buscar para pesquisar vídeos.
                  </p>

                </div>

              ) : (

                <div className="videoGrid">

                  {videos.map((video) => (

                    <article
                      className="videoCard"
                      key={video.id}
                    >

                      <div className="thumbnail">

                        {video.thumbnail && (
                          <img
                            src={video.thumbnail}
                            alt={video.titulo}
                            loading="lazy"
                          />
                        )}

                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          className="playButton"
                          title="Abrir vídeo no YouTube"
                        >
                          ▶
                        </a>

                      </div>


                      <div className="videoInfo">

                        <span className="source">
                          {video.fonte}
                        </span>

                        <h3>
                          {video.titulo}
                        </h3>

                        {video.canal && (
                          <small>
                            {video.canal}
                          </small>
                        )}

                        <button
                          onClick={() =>
                            adicionarBiblioteca(video)
                          }
                        >
                          + Adicionar à biblioteca
                        </button>

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </section>
          </>
        )}


        {/* TELA BIBLIOTECA */}

        {tela === 'biblioteca' && (

          <section className="results">

            <div className="sectionTitle">

              <div>
                <h2>
                  📚 Minha Biblioteca
                </h2>

                <p>
                  {biblioteca.length}{' '}
                  {biblioteca.length === 1
                    ? 'vídeo salvo'
                    : 'vídeos salvos'}
                </p>
              </div>

            </div>


            {biblioteca.length === 0 ? (

              <div className="empty">

                <div>📚</div>

                <h3>
                  Sua biblioteca está vazia
                </h3>

                <p>
                  Volte para Buscar vídeos e adicione
                  conteúdos à sua biblioteca.
                </p>

              </div>

            ) : (

              <div className="videoGrid">

                {biblioteca.map((video) => (

                  <article
                    className="videoCard"
                    key={video.id}
                  >

                    <div className="thumbnail">

                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.titulo}
                          loading="lazy"
                        />
                      )}

                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="playButton"
                        title="Abrir vídeo original"
                      >
                        ▶
                      </a>

                    </div>


                    <div className="videoInfo">

                      <span className="source">
                        {video.fonte}
                      </span>

                      <h3>
                        {video.titulo}
                      </h3>

                      {video.canal && (
                        <small>
                          {video.canal}
                        </small>
                      )}
                      <button
  onClick={() =>
    setVideoParaAgendar(video)
  }
>
  📅 Agendar
</button>

                      <button
                        onClick={() =>
                          removerBiblioteca(video.id)
                        }
                      >
                        Remover da biblioteca
                      </button>

                    </div>

                  </article>

                ))}

              </div>

            )}

          </section>

        )}  
        {/* TELA AGENDAMENTOS */}

{tela === 'agendamentos' && (
  <section className="results">

    <div className="sectionTitle">
      <div>
        <h2>📅 Agendamentos</h2>

        <p>
          {agendamentos.length}{' '}
          {agendamentos.length === 1
            ? 'vídeo agendado'
            : 'vídeos agendados'}
        </p>
      </div>
    </div>

    {agendamentos.length === 0 ? (

      <div className="empty">
        <div>📅</div>

        <h3>Nenhum agendamento</h3>

        <p>
          Vá até sua biblioteca e escolha um vídeo
          para agendar.
        </p>
      </div>

    ) : (

      <div className="videoGrid">

        {agendamentos.map((agendamento) => (

          <article
            className="videoCard"
            key={agendamento.id}
          >

            <div className="thumbnail">

              {agendamento.video.thumbnail && (
                <img
                  src={agendamento.video.thumbnail}
                  alt={agendamento.video.titulo}
                />
              )}

              <a
                href={agendamento.video.url}
                target="_blank"
                rel="noreferrer"
                className="playButton"
              >
                ▶
              </a>

            </div>

            <div className="videoInfo">

              <span className="source">
                {agendamento.status}
              </span>

              <h3>
                {agendamento.video.titulo}
              </h3>

              <small>
                📅 {agendamento.data}
                {' — '}
                🕐 {agendamento.hora}
              </small>

            </div>

          </article>

        ))}

      </div>

    )}

  </section>
)}

      </main>       {videoParaAgendar && (
        <AgendamentoModal
          video={videoParaAgendar}
          onFechar={() => setVideoParaAgendar(null)}
          onAgendar={(agendamento) => {
  const novosAgendamentos = [
    ...agendamentos,
    agendamento,
  ]

  setAgendamentos(novosAgendamentos)

  localStorage.setItem(
    'motor-videos-agendamentos',
    JSON.stringify(novosAgendamentos),
  )

  setVideoParaAgendar(null)

  alert('Vídeo agendado com sucesso!')
}}
            
            
          
        />
      )}

    </div>
  )
}

export default App