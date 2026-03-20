const _currentScript = document.currentScript as HTMLScriptElement | null

export function detectStrapiUrl(): string {
  if (_currentScript?.src) {
    return new URL(_currentScript.src).origin
  }
  const el = document.querySelector<HTMLScriptElement>('script[src*="music-manager/widget"]')
  if (el?.src) {
    return new URL(el.src).origin
  }
  return globalThis.location.origin
}

export function getScriptData(key: string): string | undefined {
  return _currentScript?.dataset[key] ?? undefined
}
