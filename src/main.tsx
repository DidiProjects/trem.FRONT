import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { captureEmailLink } from './utils/emailLinks'

// E-mail links land on /#<kind>=<token>: keep the token in memory and open its page
// before the router reads the address.
const link = captureEmailLink()
if (link) history.replaceState(null, '', `/${link}`)

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
