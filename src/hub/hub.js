/* Карта-глобус, выбор хранителя, энциклопедия и итоги.
   Правила миров живут в src/worlds. */
import gsap from 'gsap'
import { load, write, reset, levelOf, loadSession, rememberSession } from '../save.js'
import { CARDS } from '../rewards.js'
import { isMuted, toggleMute, audioContext } from '../audio.js'
import { HEROES, PETS } from './cast.js'
import { mountGlobe } from './globe.js'
import { mountGate } from './gate.js'
import { mountViewer } from './book.js'
import { itemById, worldOf } from '../data/curriculum.js'
import { masteryOf, topicBars, praise, weakestWorld } from '../learn.js'
import { esc } from '../shell/shell.js'
import './hub.css'

const WORLDS = [
  { id: 'city', title: 'Безопасный город', emotion: 'Героизм', cls: 'p-city' },
  { id: 'space', title: 'Космический гонщик', emotion: 'Скорость', cls: 'p-space' },
  { id: 'forest', title: 'Лесная оборона', emotion: 'Забота', cls: 'p-forest' },
  { id: 'body', title: 'Тело-подлодка', emotion: 'Тайна', cls: 'p-body' },
  { id: 'russia', title: 'Большой забег', emotion: 'Драйв', cls: 'p-russia' },
  { id: 'time', title: 'Машина времени', emotion: 'Погоня', cls: 'p-time' },
  { id: 'eco', title: 'Эко-патруль', emotion: 'Азарт', cls: 'p-eco' }
]

const GOALS = {
  city: ['Перейди улицу', 'Обереги дом', 'Не попадись в сети', 'Помоги и не рискуй', 'Останови короля'],
  space: ['От Солнца до Земли', 'Луна, день и год', 'Марс и гиганты', 'Дальний край', 'Обойди чёрную дыру'],
  forest: ['Посади начало цепи', 'Добавь зайца', 'Закрой цепь лисой', 'Верни питание в почву', 'Удержи заповедник'],
  body: ['Сердце и лёгкие', 'Мозг и сон', 'Еда и кости', 'Кожа и зубы', 'Победи вирус привычками'],
  russia: ['Северные зоны', 'Леса, степь, Волга', 'Юг и Урал', 'Города', 'Собери карту и символы'],
  time: ['Древняя Русь', 'Москва и битвы', 'Империя и свобода', 'Война и космос', 'Поймай годы по порядку'],
  eco: ['Бумага и пластик', 'Стекло и еда', 'Опасное и живое', 'Вода и воздух', 'Свалка не смешает баки']
}

const LOADERS = {
  city: () => import('../worlds/city/index.js'),
  space: () => import('../worlds/space/index.js'),
  forest: () => import('../worlds/forest/index.js'),
  body: () => import('../worlds/body/index.js'),
  russia: () => import('../worlds/russia/index.js'),
  time: () => import('../worlds/time/index.js'),
  eco: () => import('../worlds/eco/index.js')
}

export function startHub(app) {
  let data = load()
  let screen = data.hero ? 'map' : 'pick'
  let globeDestroy = null
  let gateDestroy = null
  let viewerDestroy = null
  let worldHandle = null
  let hero = data.hero || 'sol'
  let pet = data.pet || 'firefly'
  let focusWorld = 'city'
  let summaryId = 'city'
  let enteredAt = 0
  let activeLevel = 1
  let bookWorld = 'city'
  let parentOpen = false
  const fresh = []

  history.replaceState({ pg: 'hub' }, '')
  window.addEventListener('popstate', onBack)

  function paint() {
    closeExtra()
    if (screen === 'pick') paintPick()
    else if (screen === 'levels') paintLevels()
    else if (screen === 'summary') paintSummary()
    else if (screen === 'recap') paintRecap()
    else if (screen === 'parents') paintParents()
    else if (screen === 'album') paintAlbum()
    else paintMap()
  }

  function closeExtra() {
    if (globeDestroy) globeDestroy()
    globeDestroy = null
    if (gateDestroy) gateDestroy()
    gateDestroy = null
    if (viewerDestroy) viewerDestroy()
    viewerDestroy = null
  }

  function paintPick() {
    app.innerHTML = '<div class="hub hub-gate"></div>'
    gateDestroy = mountGate(app.querySelector('.hub-gate'), {
      hero, pet, look: data.look, name: data.name,
      onPlay(next) {
        hero = next.hero
        pet = next.pet
        data = write({ ...load(), hero, pet, name: next.name, look: next.look })
        screen = 'map'
        paint()
      }
    })
  }

  function paintMap() {
    data = load()
    const done = WORLDS.filter((world) => data.worlds[world.id]?.win).length
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Глобус хранителя</h1>' +
      '<p>' + esc(playerName()) + '</p></div><div class="hub-stat">' +
      '<span class="pill">Уровень ' + levelOf(data.crystals) + '</span>' +
      '<span class="pill">Кристаллы ' + data.crystals + '</span>' +
      '<span class="pill">Миры ' + done + '/7</span>' +
      '<button type="button" class="linkish" data-album>Энциклопедия</button>' +
      '<button type="button" class="linkish" data-trial>Испытание</button>' +
      '<button type="button" class="linkish" data-parents>Для родителей</button>' +
      '<button type="button" class="linkish" data-repick>Герой</button>' +
      muteButton() + '</div></header>' +
      '<div class="hub-stage"><div class="globe-wrap"><canvas data-globe></canvas>' +
      '<div class="story">Семь порталов. В каждом свои правила, свой герой и пять уровней.</div></div>' +
      '<div class="portal-grid">' + WORLDS.map((world) => {
        const stars = data.worlds[world.id]?.stars || 0
        const cleared = data.worlds[world.id]?.cleared || 0
        return '<button type="button" class="portal ' + world.cls + (data.worlds[world.id]?.win ? ' done' : '') +
          '" data-portal="' + world.id + '"><i>' + world.emotion + '</i><b>' + world.title + '</b><small>' +
          (cleared ? 'уровни ' + cleared + '/5' : 'портал ждёт') +
          (stars ? ' · ' + '★'.repeat(stars) : '') + '</small></button>'
      }).join('') + '</div></div></div>'
    globeDestroy = mountGlobe(app.querySelector('[data-globe]'))
    app.querySelector('[data-album]').addEventListener('click', () => { screen = 'album'; paint() })
    app.querySelector('[data-repick]').addEventListener('click', () => { screen = 'pick'; paint() })
    app.querySelector('[data-parents]').addEventListener('click', () => { parentOpen = false; screen = 'parents'; paint() })
    app.querySelector('[data-trial]').addEventListener('click', () => {
      focusWorld = weakestWorld(load(), WORLDS.map((world) => world.id))
      screen = 'levels'
      paint()
    })
    app.querySelectorAll('[data-portal]').forEach((btn) => btn.addEventListener('click', () => {
      focusWorld = btn.dataset.portal
      screen = 'levels'
      history.pushState({ pg: 'levels' }, '')
      paint()
    }))
    bindMute()
    gsap.from('.portal', { scale: 0.92, opacity: 0, stagger: 0.04, duration: 0.3 })
  }

  function paintLevels() {
    data = load()
    const world = WORLDS.find((item) => item.id === focusWorld)
    const cleared = data.worlds[focusWorld]?.cleared || 0
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>' + world.title + '</h1>' +
      '<p>Пять уровней. Новый открывается после победы.</p></div>' +
      '<button type="button" class="linkish" data-back>К глобусу</button>' + muteButton() +
      '</header><div class="level-grid">' + GOALS[focusWorld].map((goal, index) => {
        const level = index + 1
        const open = level <= cleared + 1
        return '<button type="button" data-level="' + level + '"' + (open ? '' : ' disabled') + '>' +
          level + '. ' + goal + '<small>' + (level <= cleared ? 'пройден' : open ? 'открыт' : 'закрыт') + '</small></button>'
      }).join('') + '</div></div>'
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
    app.querySelectorAll('[data-level]').forEach((btn) => btn.addEventListener('click', () => {
      if (btn.disabled) return
      enter(focusWorld, Number(btn.dataset.level))
    }))
    bindMute()
  }

  function paintSummary() {
    data = load()
    const world = worldOf(summaryId)
    const stats = masteryOf(summaryId, data)
    const bars = topicBars(summaryId, data)
    const shown = world.items.slice(0, 7)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Итоги Хранителя</h1><p>' + esc(praise(summaryId, data)) +
      '</p></div></header><div class="summary"><p>Знания: ' + stats.percent +
      '%. Звёзды знаний: ' + (data.knowStars[summaryId] || 0) +
      '. Игровые звёзды мира: ' + (data.worlds[summaryId]?.stars || 0) + '.</p>' +
      bars.map((bar) => '<article><b>' + esc(bar.title) + '</b><div class="bar"><i style="width:' + bar.percent + '%"></i></div></article>').join('') +
      shown.map((entry) => '<article><b>' + (data.cards.includes(entry.id) ? '✓ ' : '· ') + esc(entry.title) +
        '</b><p>' + esc(entry.text) + '</p></article>').join('') +
      '<button type="button" data-back>К карте миров</button></div></div>'
    app.querySelector('[data-back]').addEventListener('click', showRecapOrMap)
  }

  function paintRecap() {
    const lines = fresh.map((id) => itemById(id)).filter(Boolean)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Сегодня ты узнал' + ending(data.name) + '</h1>' +
      '<p>Три-пять вещей, которые стоит унести с собой.</p></div></header><div class="recap">' +
      (lines.length ? lines.slice(-5).map((entry) => '<article><b>' + esc(entry.title) + '</b><p>' + esc(entry.text) + '</p></article>').join('')
        : '<article><p>Пока новых карточек нет. Следующий уровень добавит.</p></article>') +
      '<button type="button" data-back>На глобус</button></div></div>'
    fresh.length = 0
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
  }

  function paintParents() {
    data = load()
    if (!parentOpen) {
      app.innerHTML =
        '<div class="hub"><header class="hub-top"><div><h1>Для родителей и учителя</h1>' +
        '<p>Пример, чтобы сюда не заходил ребёнок случайно.</p></div>' +
        '<button type="button" class="linkish" data-back>К глобусу</button></header>' +
        '<div class="parents"><p>Сколько будет 5 + 7?</p><input data-answer inputmode="numeric"/>' +
        '<button type="button" data-check>Открыть</button><p data-note></p></div></div>'
      app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
      app.querySelector('[data-check]').addEventListener('click', () => {
        if (app.querySelector('[data-answer]').value.trim() === '12') {
          parentOpen = true
          paint()
        } else app.querySelector('[data-note]').textContent = 'Пока не то. Попробуй ещё раз.'
      })
      return
    }
    const minutes = Math.round(data.playMs / 60000)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Как идут знания</h1><p>В игре около ' + minutes +
      ' мин. Сегодня открыто ' + loadSession().length + '.</p></div>' +
      '<button type="button" class="linkish" data-back>К глобусу</button></header><div class="parents">' +
      WORLDS.map((world) => {
        const stats = masteryOf(world.id, data)
        const weak = stats.weak.slice(0, 3).map((entry) => entry.title).join(', ')
        return '<article><b>' + world.title + '</b><div class="bar"><i style="width:' + stats.percent +
          '%"></i></div><p>' + stats.percent + '% · знания ' + (data.knowStars[world.id] || 0) +
          ' · игра ' + (data.worlds[world.id]?.stars || 0) + ' зв.' +
          (weak ? ' Повторить: ' + esc(weak) + '.' : ' Слабых мест пока нет.') + '</p></article>'
      }).join('') + '</div></div>'
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
  }

  function paintAlbum() {
    data = load()
    const world = worldOf(bookWorld)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Энциклопедия Хранителя</h1><p>' + data.cards.length +
      ' из ' + Object.keys(CARDS).length + '</p></div>' +
      '<button type="button" class="linkish" data-back>К глобусу</button>' +
      '<button type="button" class="linkish" data-reset>Сбросить прогресс</button>' + muteButton() +
      '</header><div class="book"><div><canvas data-view></canvas><div class="book-tabs">' +
      WORLDS.map((item) => '<button type="button" data-book="' + item.id + '">' + item.title + '</button>').join('') +
      '</div></div><div class="album">' + world.items.map((entry) => {
        const known = data.cards.includes(entry.id)
        return '<article class="' + (known ? '' : 'locked') + '"><h3>' + esc(known ? entry.title : 'Закрыто') +
          '</h3><p>' + esc(known ? entry.text + ' ' + entry.wonder : 'Откроется в уровне ' + entry.level + '.') + '</p></article>'
      }).join('') + '</div></div></div>'
    viewerDestroy = mountViewer(app.querySelector('[data-view]'), bookWorld)
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
    app.querySelectorAll('[data-book]').forEach((btn) => btn.addEventListener('click', () => {
      bookWorld = btn.dataset.book
      paint()
    }))
    app.querySelector('[data-reset]').addEventListener('click', () => {
      if (window.confirm('Стереть кристаллы, энциклопедию и победы на этом компьютере?')) {
        data = reset()
        hero = 'sol'
        pet = 'firefly'
        screen = 'pick'
        paint()
      }
    })
    bindMute()
  }

  async function enter(id, level) {
    audioContext()
    closeExtra()
    activeLevel = level
    summaryId = id
    enteredAt = performance.now()
    history.pushState({ pg: 'world', id, level }, '')
    const mod = await LOADERS[id]()
    const host = document.createElement('div')
    host.style.height = '100%'
    app.replaceChildren(host)
    worldHandle = await mod.mount(host, {
      hero: HEROES.find((item) => item.id === data.hero) || HEROES[0],
      pet: data.pet,
      level,
      discover(cardId) {
        data = load()
        if (!data.cards.includes(cardId) && CARDS[cardId]) {
          data.cards = data.cards.concat(cardId)
          data.crystals += 1
          write(data)
          if (!fresh.includes(cardId)) fresh.push(cardId)
          rememberSession(cardId)
        }
      },
      grade(cardId, ok) {
        if (!CARDS[cardId]) return
        data = load()
        const row = data.mastery[cardId] || { ok: 0, bad: 0 }
        if (ok) row.ok += 1
        else row.bad += 1
        data.mastery[cardId] = row
        write(data)
      },
      finish(result) { finish(id, level, result) }
    })
  }

  function finish(id, level, result) {
    data = load()
    if (enteredAt) data.playMs += performance.now() - enteredAt
    enteredAt = 0
    const prev = data.worlds[id] || { stars: 0, win: false, cleared: 0 }
    const stars = Math.max(prev.stars || 0, result.stars || 0)
    const cleared = result.win ? Math.max(prev.cleared || 0, level) : (prev.cleared || 0)
    const firstWin = result.win && !prev.win
    data.worlds[id] = { stars, win: prev.win || !!result.win, cleared }
    if (firstWin) data.crystals += 6
    data.knowStars[id] = Math.max(data.knowStars[id] || 0, masteryOf(id, data).stars)
    write(data)
    if (worldHandle) worldHandle.destroy()
    worldHandle = null
    if (result.next && result.win && level < 5) {
      enter(id, level + 1)
      return
    }
    if (result.win) {
      screen = 'summary'
      paint()
      return
    }
    showRecapOrMap()
  }

  function showRecapOrMap() {
    screen = fresh.length ? 'recap' : 'map'
    paint()
  }

  function onBack() {
    if (!worldHandle) {
      if (screen !== 'map' && screen !== 'pick') {
        screen = data.hero ? 'map' : 'pick'
        paint()
      }
      return
    }
    const ended = document.querySelector('[data-world-result]:not([hidden])')
    const ok = ended || window.confirm('Выйти на карту? Полученные звёзды и кристаллы сохранятся.')
    if (!ok) {
      history.pushState({ pg: 'world' }, '')
      return
    }
    if (worldHandle) worldHandle.destroy()
    worldHandle = null
    if (enteredAt) {
      data = load()
      data.playMs += performance.now() - enteredAt
      write(data)
      enteredAt = 0
    }
    showRecapOrMap()
  }

  function muteButton() {
    return '<button type="button" class="hub-mute" data-mute>' + (isMuted() ? 'Тихо' : 'Звук') + '</button>'
  }
  function bindMute() {
    const btn = app.querySelector('[data-mute]')
    if (!btn) return
    btn.addEventListener('click', () => {
      audioContext()
      toggleMute()
      btn.textContent = isMuted() ? 'Тихо' : 'Звук'
    })
  }
  function playerName() {
    const heroName = (HEROES.find((item) => item.id === data.hero) || HEROES[0]).name
    const petName = (PETS.find((item) => item.id === data.pet) || PETS[0]).name
    return (data.name ? data.name + ' · ' : '') + heroName + ' и ' + petName
  }

  paint()
}

function ending(name) {
  if (!name) return ''
  return ', ' + name
}
