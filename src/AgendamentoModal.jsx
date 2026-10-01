import { useState } from 'react'

function AgendamentoModal({ video, onFechar, onAgendar }) {
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')

  function confirmarAgendamento() {
    if (!data || !hora) {
      alert('Escolha a data e a hora.')
      return
    }

    onAgendar({
      id: crypto.randomUUID(),
      video,
      data,
      hora,
      status: 'agendado',
      criadoEm: new Date().toISOString(),
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
          >
            📅 Confirmar agendamento
          </button>

        </div>

      </div>
    </div>
  )
}

export default AgendamentoModal