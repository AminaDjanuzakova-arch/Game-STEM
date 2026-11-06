/* Прогресс хранителя. Старые сохранения без новых полей тоже открываются. */
const KEY = 'planet-guardians-arcade-v1'
const SESSION = 'planet-guardians-session-v1'

const EMPTY = {
  hero: null,
  pet: null,
  name: '',
  look: { hat: 'cap', cape: 'short', tint: 0 },
  crystals: 0,
  worlds: {},
  cards: [],
  mastery: {},
  knowStars: {},
  playMs: 0
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY)
    return normalize(JSON.parse(raw))
  } catch (err) {
    return structuredClone(EMPTY)
  }
}

export function write(data) {
  const next = normalize(data)
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function update(patch) {
  return write({ ...load(), ...patch })
}

export function reset() {
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(SESSION)
  return structuredClone(EMPTY)
}

export function levelOf(crystals) {
  return 1 + Math.floor((Number(crystals) || 0) / 8)
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

export function rememberSession(id) {
  const list = loadSession()
  if (!list.includes(id)) {
    list.push(id)
    sessionStorage.setItem(SESSION, JSON.stringify(list))
  }
  return list
}

export function clearSession() {
  sessionStorage.removeItem(SESSION)
}

function normalize(data) {
  const look = data.look && typeof data.look === 'object' ? data.look : {}
  return {
    hero: data.hero || null,
    pet: data.pet || null,
    name: typeof data.name === 'string' ? data.name.replace(/[<>]/g, '').trim().slice(0, 16) : '',
    look: {
      hat: ['none', 'cap', 'crown', 'helm'].includes(look.hat) ? look.hat : 'cap',
      cape: ['none', 'short', 'long'].includes(look.cape) ? look.cape : 'short',
      tint: Math.max(0, Math.min(3, Number(look.tint) || 0))
    },
    crystals: Number(data.crystals) || 0,
    worlds: data.worlds && typeof data.worlds === 'object' ? data.worlds : {},
    cards: Array.isArray(data.cards) ? data.cards.filter((id) => typeof id === 'string') : [],
    mastery: data.mastery && typeof data.mastery === 'object' ? data.mastery : {},
    knowStars: data.knowStars && typeof data.knowStars === 'object' ? data.knowStars : {},
    playMs: Number(data.playMs) || 0
  }
}
