/* Пауза, выход, карточка и «потому что» — общая оболочка миров.
   Правила мира сюда не переносятся. */
import { beep, setHold } from '../audio.js'
import { itemById } from '../data/curriculum.js'
import './shell.css'

export function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
}

export function mountChrome(root, api) {
  const host = root.querySelector('section') || root
  host.style.position = host.style.position || 'relative'
  host.insertAdjacentHTML('beforeend',
    '<button type="button" class="pg-pause" data-pause aria-label="Пауза"><i></i><b></b></button>' +
    '<div class="pg-menu" data-pause-menu hidden><div><h2>Пауза</h2>' +
    '<button type="button" data-resume>Продолжить</button>' +
    '<button type="button" data-restart>Начать заново</button>' +
    '<button type="button" data-map>К карте миров</button>' +
    '<button type="button" data-sound>Звук</button></div></div>' +
    '<div class="pg-why" data-why hidden></div>' +
    '<div class="pg-cardpop" data-cardpop hidden></div>')
  const menu = host.querySelector('[data-pause-menu]')
  let open = false
  function setOpen(next) {
    open = next
    menu.hidden = !open
    setHold(open)
    if (open) api.pause()
    else api.resume()
    paintSound()
  }
  function paintSound() {
    host.querySelector('[data-sound]').textContent = api.muted() ? 'Звук включить' : 'Звук выключить'
  }
  function onKey(event) {
    if (event.key !== 'Escape') return
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return
    event.preventDefault()
    setOpen(!open)
  }
  host.querySelector('[data-pause]').addEventListener('click', () => setOpen(true))
  host.querySelector('[data-resume]').addEventListener('click', () => setOpen(false))
  host.querySelector('[data-restart]').addEventListener('click', () => {
    setOpen(false)
    api.retry()
  })
  host.querySelector('[data-map]').addEventListener('click', () => api.exit())
  host.querySelector('[data-sound]').addEventListener('click', () => {
    api.toggleSound()
    paintSound()
  })
  window.addEventListener('keydown', onKey)
  paintSound()
  return {
    destroy() {
      setHold(false)
      window.removeEventListener('keydown', onKey)
    }
  }
}

export function endMarkup(title, text, win, level) {
  const next = win && level < 5
    ? '<button type="button" data-world-next>Следующий уровень</button>'
    : ''
  return '<div><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="pg-end-row">' +
    '<button type="button" data-world-retry>Играть ещё</button>' +
    '<button type="button" data-world-exit>К карте миров</button>' + next + '</div></div>'
}

export function bindEnd(end, hub, { win, stars, retry }) {
  const again = end.querySelector('[data-world-retry]')
  if (again) again.addEventListener('click', retry)
  const exit = end.querySelector('[data-world-exit]')
  if (exit) exit.addEventListener('click', () => hub.finish({ win, stars, leave: true }))
  const next = end.querySelector('[data-world-next]')
  if (next) next.addEventListener('click', () => hub.finish({ win, stars, next: true }))
}

export function requestExit(root, hub) {
  const ended = root.querySelector('[data-world-result]:not([hidden])')
  if (!ended && !window.confirm('Выйти на карту? Полученные звёзды и кристаллы сохранятся.')) return
  hub.finish({ win: false, stars: 0, leave: true })
}

export function mentor(root, text) {
  showWhy(root, text, false)
}

export function award(root, hub, id) {
  const item = itemById(id)
  if (!item) return
  hub.discover(id)
  if (hub.grade) hub.grade(id, true)
  const box = root.querySelector('[data-cardpop]')
  if (!box) return
  const known = (root.dataset.awarded || '').split(',').filter(Boolean)
  if (known.includes(id)) return
  root.dataset.awarded = known.concat(id).join(',')
  box.hidden = false
  box.innerHTML = '<strong>' + esc(item.title) + '</strong><span>' + esc(item.text) +
    '</span><em>' + esc(item.wonder) + '</em>'
  beep(660, 0.08, 'triangle', 0.04)
  window.clearTimeout(box._t)
  box._t = window.setTimeout(() => { box.hidden = true }, 2600)
}

export function fault(root, hub, id) {
  const item = itemById(id)
  if (hub.grade && id) hub.grade(id, false)
  if (item) showWhy(root, item.why, true)
}

function showWhy(root, text, bad) {
  const box = root.querySelector('[data-why]')
  if (!box || !text) return
  box.hidden = false
  box.textContent = text
  box.style.background = bad ? '#fee2e2' : '#ecfeff'
  beep(bad ? 180 : 520, 0.08, 'sine', 0.03)
  window.clearTimeout(box._t)
  box._t = window.setTimeout(() => { box.hidden = true }, 2400)
}
