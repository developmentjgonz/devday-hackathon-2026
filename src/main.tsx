import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DemoAccount, type DemoPreferences } from './components/DemoAccount'
import './styles/globals.css'

function applyPreferences(preferences: DemoPreferences) {
  document.documentElement.dataset.demoTheme = preferences.theme
  document.documentElement.dataset.demoDensity = preferences.density
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <div className="demo-account-dock"><DemoAccount onPreferencesChange={applyPreferences} /></div>
  </StrictMode>,
)
