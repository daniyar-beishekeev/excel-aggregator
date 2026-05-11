import React, {StrictMode} from 'react'

import '../App.css'

import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '../css_cdn/formio.full.css'

function App() {
  if (!import.meta.env.DEV) return <>AVAILABLE IN DEV MODE ONLY</>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
