import { useEffect, useState } from 'react'

function AgendamentoModal({ video, onFechar, onAgendar }) { 
  console.log('🎬 VIDEO RECEBIDO PELO MODAL:', video)
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [creator, setCreator] = useState(null)
  const [carregandoCreator, setCarregandoCreator] =
  useState(true)
  const [erroCreator, setErroCreator] = useState('')
  const [privacidade, setPrivacidade] = useState('')
  const [permitirComentarios, setPermitirComentarios] =
  useState(true)
  const [confirmouPublicacao, setConfirmouPublicacao] =
  useState(false)
  const [tituloPublicacao, setTituloPublicacao] =
  useState(video?.titulo || '')

  const [permitirDueto, setPermitirDueto] =
  useState(false)

  const [permitirStitch, setPermitirStitch] =
  useState(false)

  useEffect(() => {
    async function carregarCreatorInfo() {
      try {
        setCarregandoCreator(true)
        setErroCreator('')

        const response = await fetch(
          'http://localhost:3001/api/tiktok/creator-info',
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'Não foi possível consultar a conta TikTok.',
          )
        }

        setCreator(data.creator)

        setPrivacidade('')
        setPermitirComentarios(false)
        setPermitirDueto(false)
        setPermitirStitch(false)

    }   catch (error) {
        console.error(
          'Erro ao carregar Creator Info:',
          error,
        )

      setErroCreator(
        error instanceof Error
          ? error.message
          : 'Erro ao consultar TikTok.',
      )
    } finally {
      setCarregandoCreator(false)
    }
  }

  carregarCreatorInfo()
}, [])
  

  function confirmarAgendamento() {
    if (!data || !hora) {
      alert('Escolha a data e a hora.')
      return
    }
if (
  creator?.maxVideoDuration &&
  video?.duracao > creator.maxVideoDuration
) {
  alert(
    `Este vídeo tem ${Math.ceil(video.duracao)} segundos, mas o TikTok permite no máximo ${creator.maxVideoDuration} segundos.`,
  )
  return
}
    console.log('📅 DADOS DO MODAL:', {
  data,
  hora,
  caminhoVideo: video.caminhoVideo,
})
if (!tituloPublicacao.trim()) {
  alert('Digite um título ou legenda para a publicação.')
  return
}

    onAgendar({
  id: crypto.randomUUID(),
  video: {
  ...video,
  titulo: tituloPublicacao.trim(),
},
  data,
  hora,
  status: 'agendado',
  criadoEm: new Date().toISOString(),
  caminhoVideo: video.caminhoVideo,
  confirmouPublicacao,

  tiktok: {
    username: creator?.username ?? null,
    privacidade,
    permitirComentarios,
    permitirDueto,
    permitirStitch,
  },
})
  }

  if (!video) return null

  return (
    <div className="modalOverlay">
      <div className="modalAgendamento">

        <div className="modalHeader">
          <div>
            <span className="source">
              AGENDAMENTO
            </span>

            <h2>Agendar vídeo</h2>
          </div>

          <button
            className="modalClose"
            onClick={onFechar}
          >
            ✕
          </button>
        </div>

        <div className="modalVideo">

          {video.thumbnail && (
            <img
              src={video.thumbnail}
              alt={video.titulo}
            />
          )}

          <div>
            <strong>{video.titulo}</strong>

            {video.canal && (
              <small>{video.canal}</small>
            )}
          </div>

        </div>

        {carregandoCreator && (
  <div className="tiktokCreator">
    <small>Consultando conta TikTok...</small>
  </div>
)}

{erroCreator && (
  <div className="tiktokCreator">
    <small>⚠️ {erroCreator}</small>
  </div>
)}

{creator && (
  <div className="tiktokCreator">
<div className="tiktokContaInfo">
  <strong>Conta TikTok conectada</strong>

  <span className="tiktokNickname">
    {creator.nickname || creator.username}
  </span>

  <small className="tiktokUsername">
    @{creator.username}
  </small>
</div>

    <label>
      Privacidade

      <select
        value={privacidade}
        onChange={(e) =>
          setPrivacidade(e.target.value)
        }
        
      >
        <option value="" disabled>
            Selecione a privacidade
        </option>
        {creator.privacyLevels.map((nivel) => (
          <option
            key={nivel}
            value={nivel}
          >
            {nivel === 'FOLLOWER_OF_CREATOR'
              ? 'Seguidores'
              : nivel === 'MUTUAL_FOLLOW_FRIENDS'
                ? 'Amigos'
                : nivel === 'SELF_ONLY'
                  ? 'Somente eu'
                  : nivel}
          </option>
        ))}
      </select>
    </label>

    <div className="tiktokOptions">
      <label>
        <input
          type="checkbox"
          checked={permitirComentarios}
          disabled={creator.commentsDisabled}
          onChange={(e) =>
            setPermitirComentarios(
              e.target.checked,
            )
          }
        />
        Permitir comentários
      </label>

      <label>
        <input
          type="checkbox"
          checked={permitirDueto}
          disabled={creator.duetDisabled}
          onChange={(e) =>
            setPermitirDueto(
              e.target.checked,
            )
          }
        />
        Permitir dueto
      </label>

      <label>
        <input
          type="checkbox"
          checked={permitirStitch}
          disabled={creator.stitchDisabled}
          onChange={(e) =>
            setPermitirStitch(
              e.target.checked,
            )
          }
        />
        Permitir Stitch
      </label>
    </div>

    <small>
      Duração máxima permitida:{' '}
      {Math.floor(
        creator.maxVideoDuration / 60,
      )}{' '}
      minutos
    </small>
  </div>
)}

<label>
  Título / legenda da publicação

  <input
    type="text"
    value={tituloPublicacao}
    onChange={(e) =>
      setTituloPublicacao(e.target.value)
    }
    placeholder="Digite o título ou legenda do vídeo"
  />
</label>

        <div className="modalFields">

          <label>
            Data

            <input
              type="date"
              value={data}
              onChange={(e) =>
                setData(e.target.value)
              }
            />
          </label>

          <label>
            Horário

            <input
              type="time"
              value={hora}
              onChange={(e) =>
                setHora(e.target.value)
              }
            />
          </label>

        </div>

        <div className="resumoPublicacao">
  <strong>Resumo da publicação</strong>

  <span>
    Conta: @{creator?.username || '-'}
  </span>

  <span>
    Privacidade:{' '}
    {privacidade === 'FOLLOWER_OF_CREATOR'
      ? 'Seguidores'
      : privacidade === 'MUTUAL_FOLLOW_FRIENDS'
        ? 'Amigos'
        : privacidade === 'SELF_ONLY'
          ? 'Somente eu'
          : privacidade === 'PUBLIC_TO_EVERYONE'
            ? 'Público'
            : 'Não selecionada'}
  </span>

  <span>
    Título: {tituloPublicacao || '-'}
  </span>

  <span>
    Comentários:{' '}
    {permitirComentarios ? 'Sim' : 'Não'}
  </span>

  <span>
    Dueto:{' '}
    {permitirDueto ? 'Sim' : 'Não'}
  </span>

  <span>
    Stitch:{' '}
    {permitirStitch ? 'Sim' : 'Não'}
  </span>
</div>

<label className="consentimentoPublicacao">
  <input
    type="checkbox"
    checked={confirmouPublicacao}
    onChange={(e) =>
      setConfirmouPublicacao(e.target.checked)
    }
  />

  Confirmo que este vídeo é meu e autorizo o Motor Videos a publicá-lo na conta TikTok conectada conforme as configurações escolhidas.
</label>

{!confirmouPublicacao && (
  <small className="avisoConsentimento">
    Marque a confirmação acima para liberar o agendamento.
  </small>
)}

<div className="modalActions">
  <button
    className="cancelButton"
    onClick={onFechar}
  >
    Cancelar
  </button>

  <button
    className="scheduleButton"
    onClick={confirmarAgendamento}
    disabled={
      carregandoCreator ||
      Boolean(erroCreator) ||
      !creator ||
      !privacidade ||
      !confirmouPublicacao
    }
  >
    {carregandoCreator
      ? '⏳ Carregando TikTok...'
      : '📅 Confirmar agendamento'}
  </button>
</div>
        </div>

      </div>
  )
}

export default AgendamentoModal