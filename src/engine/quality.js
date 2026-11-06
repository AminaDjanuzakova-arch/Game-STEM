/* Слабый ноутбук или планшет получает более лёгкую картинку. */
export function qualityTier() {
  const memory = navigator.deviceMemory || 4
  const cores = navigator.hardwareConcurrency || 4
  const narrow = Math.min(window.innerWidth || 1280, window.innerHeight || 800) < 700
  if (memory <= 2 || cores <= 2 || narrow) return 'low'
  return 'high'
}

export function pixelRatio() {
  const cap = qualityTier() === 'low' ? 1 : 1.5
  return Math.min(window.devicePixelRatio || 1, cap)
}
