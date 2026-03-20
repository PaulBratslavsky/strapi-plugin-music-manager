import React from 'react'
import { createRoot } from 'react-dom/client'
import { MusicPlayerWidget } from './components/MusicPlayerWidget'
import cssText from './styles.css?inline'
import { detectStrapiUrl, getScriptData } from './auto-detect'

function mount() {
  const strapiUrl = detectStrapiUrl()
  const initialSong = getScriptData('song')

  // Inject scoped styles into <head>
  const style = document.createElement('style')
  style.textContent = cssText
  document.head.appendChild(style)

  // Create mount point
  const mountPoint = document.createElement('div')
  mountPoint.id = 'strapi-music-widget'
  document.body.appendChild(mountPoint)

  const root = createRoot(mountPoint)
  root.render(
    React.createElement(MusicPlayerWidget, { strapiUrl, initialSong })
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
