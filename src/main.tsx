import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Workspace } from './Workspace'
import { PrivatePhotos } from './components/PrivatePhotos'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Workspace photos={<PrivatePhotos/>} />
  </StrictMode>,
)
