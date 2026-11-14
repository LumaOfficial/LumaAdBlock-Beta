import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './lib/store.jsx'
import { isExtension } from './lib/platform.js'
import './index.css'

// The extension page is loaded from chrome-extension://, so it routes on the hash.
const Router = isExtension ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AppProvider>
        <App />
      </AppProvider>
    </Router>
  </React.StrictMode>,
)
