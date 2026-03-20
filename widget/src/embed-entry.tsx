import React from 'react'
import { createRoot } from 'react-dom/client'
import { SingleSongEmbed } from './components/SingleSongEmbed'
import cssText from './embed-styles.css?inline'

function mount() {
  // Get config from the script tag or URL params
  const script = document.currentScript as HTMLScriptElement | null
  const urlParams = new URLSearchParams(window.location.search)

  const strapiUrl = script?.src
    ? new URL(script.src).origin
    : urlParams.get('strapiUrl') || window.location.origin

  const songId = script?.dataset.song || urlParams.get('song') || undefined
  const theme = script?.dataset.theme || urlParams.get('theme') || ''

  // Apply theme
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  }

  // Inject styles
  const style = document.createElement('style')
  style.textContent = cssText
  document.head.appendChild(style)

  // Mount
  const mountPoint = document.getElementById('strapi-music-embed')
    || document.createElement('div')
  if (!mountPoint.id) {
    mountPoint.id = 'strapi-music-embed'
    document.body.appendChild(mountPoint)
  }
  mountPoint.style.width = '100%'
  mountPoint.style.height = '100%'

  const root = createRoot(mountPoint)
  root.render(
    React.createElement(SingleSongEmbed, { strapiUrl, songId })
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
