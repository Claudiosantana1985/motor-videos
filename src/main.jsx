import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Termos from './Termos.jsx'
import Privacidade from './Privacidade.jsx'

const caminho = window.location.pathname

function escolherPagina() {
  if (caminho === '/termos') {
    return <Termos />
  }

  if (caminho === '/privacidade') {
    return <Privacidade />
  }

  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {escolherPagina()}
  </StrictMode>,
)