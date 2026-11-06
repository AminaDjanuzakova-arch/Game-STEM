/* Прогресс хранителя: герой, кристаллы, миры и карточки. Только этот ключ. */
const KEY = 'planet-guardians-arcade-v1'

const EMPTY = {
  hero: null,
  pet: null,
  crystals: 0,
  worlds: {},
  cards: []
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY)
    const data = JSON.parse(raw)
    return {
      hero: data.hero || null,
      pet: data.pet || null,
      crystals: Number(data.crystals) || 0,
      worlds: data.worlds && typeof data.worlds === 'object' ? data.worlds : {},
      cards: Array.isArray(data.cards) ? data.cards : []
    }
  } catch (err) {
    return structuredClone(EMPTY)
  }
}

export function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
  return data
}

export function update(patch) {
  const next = { ...load(), ...patch }
  return write(next)
}

export function reset() {
  localStorage.removeItem(KEY)
  return structuredClone(EMPTY)
}

export function levelOf(crystals) {
  return 1 + Math.floor((Number(crystals) || 0) / 8)
}
