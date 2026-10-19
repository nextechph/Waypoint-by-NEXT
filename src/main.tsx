import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import './styles/waypoint.css'
import './styles/transitions.css'
import './styles/transitions-wiring-shell.css'
import './styles/transitions-wiring-pages.css'
import './styles/transitions-wiring-tasks.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
