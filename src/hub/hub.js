/* Штаб хранителя: остров миров, три уровня, энциклопедия и учитель.
   Правила игр живут в src/worlds. */
import gsap from 'gsap'
import * as THREE from 'three'
import { load, write, reset, levelOf, loadSession, rememberSession } from '../save.js'
import { CARDS } from '../rewards.js'
import { isMuted, toggleMute, audioContext } from '../audio.js'
import { HEROES, PETS } from './cast.js'
import { mountGate } from './gate.js'
import { mountViewer } from './book.js'
import { mountIsland } from './island.js'
import { itemById, worldOf } from '../data/curriculum.js'
import { masteryOf, topicBars, praise } from '../learn.js'
import { esc } from '../shell/shell.js'
import { loadTeacher, saveTeacher, prizeFor, downloadCertificate, DEFAULT_PRIZES } from '../teacher.js'
import { createStage, mesh, geo, mat } from '../engine/kit.js'
import '../engine/frame.css'
import './hub.css'

const WORLDS = [
  { id: 'city', title: 'Безопасный город' },
  { id: 'space', title: 'Космический гонщик' },
  { id: 'forest', title: 'Лесная оборона' },
  { id: 'body', title: 'Тело-подлодка' },
  { id: 'russia', title: 'Большой забег' },
  { id: 'time', title: 'Машина времени' },
  { id: 'eco', title: 'Эко-патруль' }
]

const GOALS = {
  city: ['Перейди улицу', 'Обереги дом и людей', 'Останови короля'],
  space: ['Собери близкие планеты', 'Обойди камни', 'Маяки у чёрной дыры'],
  forest: ['Посади траву', 'Закрой цепь', 'Удержи тучу'],
  body: ['Сбей микробов', 'Целься сам', 'Победи вирус'],
  russia: ['Короткий север', 'Дальше по зонам', 'Ворота зверей'],
  time: ['Древняя Русь', 'Позже и быстрее', 'Годы по порядку'],
  eco: ['Бумага и пластик', 'Все баки и птенец', 'Быстрая смена']
}

const LOADERS = {
  city: () => import('../worlds/city/index.js'),
  space: () => import('../worlds/space/index.js'),
  forest: () => import('../worlds/forest/index.js'),
  body: () => import('../worlds/body/index.js'),
  russia: () => import('../worlds/russia/index.js'),
  time: () => import('../worlds/time/index.js'),
  eco: () => import('../worlds/eco/index.js'),
  trial: () => import('../worlds/trial/index.js')
}

export function startHub(app) {
  let data = load()
  let screen = data.hero ? 'map' : 'pick'
  let gateDestroy = null
  let viewerDestroy = null
  let islandDestroy = null
  let chestDestroy = null
  let labelFrame = 0
  let worldHandle = null
  let hero = data.hero || 'sol'
  let pet = data.pet || 'firefly'
  let focusWorld = 'city'
  let summaryId = 'city'
  let enteredAt = 0
  let bookWorld = 'city'
  let teacherOpen = false
  const fresh = []

  history.replaceState({ pg: 'hub' }, '')
  window.addEventListener('popstate', onBack)

  function paint() {
    closeExtra()
    if (screen === 'pick') paintPick()
    else if (screen === 'levels') paintLevels()
    else if (screen === 'summary') paintSummary()
    else if (screen === 'recap') paintRecap()
    else if (screen === 'teacher') paintTeacher()
    else if (screen === 'album') paintAlbum()
    else if (screen === 'rewards') paintRewards()
    else if (screen === 'chest') paintChest()
    else paintMap()
  }

  function closeExtra() {
    cancelAnimationFrame(labelFrame)
    if (gateDestroy) gateDestroy()
    gateDestroy = null
    if (viewerDestroy) viewerDestroy()
    viewerDestroy = null
    if (islandDestroy) islandDestroy()
    islandDestroy = null
    if (chestDestroy) chestDestroy()
    chestDestroy = null
  }

  function paintPick() {
    app.innerHTML = '<div class="hub"><div class="hub-gate"></div>' + dock('hero') + '</div>'
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
    bindDock()
  }

  function paintMap() {
    data = load()
    const done = WORLDS.filter((world) => clearedOf(world.id) >= 3).length
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Штаб хранителя</h1>' +
      '<p>' + esc(playerName()) + '</p></div><div class="hub-stat">' +
      '<span class="pill">Уровень ' + levelOf(data.crystals) + '</span>' +
      '<span class="pill">Кристаллы ' + data.crystals + '</span>' +
      '<span class="pill">Темы ' + done + '/7</span>' +
      muteButton() + '</div></header>' +
      '<div class="island-wrap"><canvas data-island></canvas><div class="island-labels">' +
      WORLDS.map((world) => {
        const cleared = clearedOf(world.id)
        const stars = data.worlds[world.id]?.stars || 0
        return '<button type="button" class="isle" data-portal="' + world.id + '"><b>' + world.title +
          '</b><small>' + cleared + '/3' + (stars ? ' · ' + '★'.repeat(Math.min(3, stars)) : '') + '</small></button>'
      }).join('') + '</div></div>' + dock('worlds') + '</div>'
    const island = mountIsland(app.querySelector('[data-island]'))
    islandDestroy = island.destroy
    function follow() {
      if (screen !== 'map') return
      island.project().forEach((spot) => {
        const btn = app.querySelector('[data-portal="' + spot.id + '"]')
        if (!btn) return
        btn.style.left = spot.left + 'px'
        btn.style.top = spot.top + 'px'
      })
      labelFrame = requestAnimationFrame(follow)
    }
    follow()
    app.querySelectorAll('[data-portal]').forEach((btn) => btn.addEventListener('click', () => {
      focusWorld = btn.dataset.portal
      screen = 'levels'
      history.pushState({ pg: 'levels' }, '')
      paint()
    }))
    bindDock()
    bindMute()
  }

  function paintLevels() {
    data = load()
    const world = WORLDS.find((item) => item.id === focusWorld)
    const cleared = clearedOf(focusWorld)
    const prize = data.prizes?.[focusWorld]
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>' + world.title + '</h1>' +
      '<p>Три ступени. Следующая открывается после победы.</p></div>' +
      '<button type="button" class="linkish" data-back>К карте миров</button>' + muteButton() +
      '</header><div class="stairs">' + GOALS[focusWorld].map((goal, index) => {
        const level = index + 1
        const open = level <= cleared + 1
        return '<button type="button" data-level="' + level + '"' + (open ? '' : ' disabled') + '>' +
          (open ? level + '. ' + goal : 'Замок') +
          '<small>' + (level <= cleared ? 'пройден' : open ? 'открыт' : 'сначала пройди прошлый') + '</small></button>'
      }).join('') +
      '<div class="chest-card"><b>' + (prize ? 'Приз получен' : 'Сундук темы') + '</b><p>' +
      esc(prize ? prize.title : 'Откроется после трёх уровней') + '</p>' +
      (cleared >= 3 && !prize ? '<button type="button" data-claim>Открыть сундук</button>' : '') +
      '</div></div>' + dock('worlds') + '</div>'
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
    app.querySelectorAll('[data-level]').forEach((btn) => btn.addEventListener('click', () => {
      if (btn.disabled) return
      enter(focusWorld, Number(btn.dataset.level))
    }))
    const claim = app.querySelector('[data-claim]')
    if (claim) claim.addEventListener('click', () => givePrize(focusWorld))
    bindDock()
    bindMute()
  }

  function paintSummary() {
    data = load()
    const world = worldOf(summaryId)
    const stats = masteryOf(summaryId, data)
    const bars = topicBars(summaryId, data)
    const shown = world.items.filter((entry) => data.cards.includes(entry.id)).slice(-7)
    const lines = shown.length ? shown : world.items.slice(0, 5)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Что я теперь знаю</h1><p>' + esc(praise(summaryId, data)) +
      '</p></div></header><div class="summary"><p>Знания: ' + stats.percent +
      '%. Звёзды знаний: ' + (data.knowStars[summaryId] || 0) +
      '. Звёзды игры: ' + (data.worlds[summaryId]?.stars || 0) + '.</p>' +
      bars.map((bar) => '<article><b>' + esc(bar.title) + '</b><div class="bar"><i style="width:' + bar.percent + '%"></i></div></article>').join('') +
      lines.map((entry) => '<article><b>' + esc(entry.title) + '</b><p>' + esc(entry.text) +
        '</p><p>' + esc(entry.wonder) + '</p></article>').join('') +
      '<button type="button" data-back>Дальше</button></div></div>'
    app.querySelector('[data-back]').addEventListener('click', showRecapOrMap)
  }

  function paintRecap() {
    const lines = fresh.map((id) => itemById(id)).filter(Boolean)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Сегодня ты узнал' + ending(data.name) + '</h1></div></header><div class="recap">' +
      (lines.length ? lines.slice(-5).map((entry) => '<article><b>' + esc(entry.title) + '</b><p>' + esc(entry.text) + '</p></article>').join('')
        : '<article><p>Новых карточек пока нет.</p></article>') +
      '<button type="button" data-back>К карте миров</button></div></div>'
    fresh.length = 0
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
  }

  function paintAlbum() {
    data = load()
    const world = worldOf(bookWorld)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Энциклопедия</h1><p>' + data.cards.length +
      ' из ' + Object.keys(CARDS).length + '</p></div>' +
      '<button type="button" class="linkish" data-back>К карте</button>' + muteButton() +
      '</header><div class="book"><div><canvas data-view></canvas><div class="book-tabs">' +
      WORLDS.map((item) => '<button type="button" data-book="' + item.id + '">' + item.title + '</button>').join('') +
      '</div></div><div class="album">' + world.items.map((entry) => {
        const known = data.cards.includes(entry.id)
        return '<article class="' + (known ? '' : 'locked') + '"><h3>' + esc(known ? entry.title : 'Закрыто') +
          '</h3><p>' + esc(known ? entry.text + ' ' + entry.wonder : 'Встретится в игре.') + '</p></article>'
      }).join('') + '</div></div>' + dock('book') + '</div>'
    viewerDestroy = mountViewer(app.querySelector('[data-view]'), bookWorld)
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
    app.querySelectorAll('[data-book]').forEach((btn) => btn.addEventListener('click', () => {
      bookWorld = btn.dataset.book
      paint()
    }))
    bindDock()
    bindMute()
  }

  function paintRewards() {
    data = load()
    const rows = WORLDS.slice().sort((a, b) => (data.prizes?.[b.id] ? 1 : 0) - (data.prizes?.[a.id] ? 1 : 0)).map((world) => {
      const prize = data.prizes?.[world.id]
      return '<article><b>' + world.title + '</b><p>' + (prize ? esc(prize.title) + ' · ' + esc(prize.date || '') : 'Сундук ещё закрыт') +
        '</p>' + (prize ? '<button type="button" data-cert="' + world.id + '">Сертификат</button>' : '') + '</article>'
    }).join('')
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Награды и призы</h1>' +
      '<p>Кристаллы: ' + data.crystals + '. Карточки: ' + data.cards.length + '.</p></div></header>' +
      '<div class="summary">' + rows + '</div>' + dock('rewards') + '</div>'
    app.querySelectorAll('[data-cert]').forEach((btn) => btn.addEventListener('click', () => {
      const world = WORLDS.find((item) => item.id === btn.dataset.cert)
      const prize = load().prizes[world.id]
      downloadCertificate({ world: world.title, name: prize.name || data.name, prize: prize.title, date: prize.date })
    }))
    bindDock()
  }

  function paintTeacher() {
    if (!teacherOpen) {
      app.innerHTML =
        '<div class="hub"><header class="hub-top"><div><h1>Для учителя</h1>' +
        '<p>Простой пример, чтобы раздел не открыл ребёнок.</p></div></header>' +
        '<div class="parents"><p>Сколько будет 7 + 8?</p><input data-answer inputmode="numeric"/>' +
        '<button type="button" data-check>Открыть</button><p data-note></p></div>' + dock('teacher') + '</div>'
      app.querySelector('[data-check]').addEventListener('click', () => {
        if (app.querySelector('[data-answer]').value.trim() === '15') {
          teacherOpen = true
          paint()
        } else app.querySelector('[data-note]').textContent = 'Пока не то.'
      })
      bindDock()
      return
    }
    data = load()
    const teacher = loadTeacher()
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Кабинет учителя</h1>' +
      '<p>Призы, ученики и где были ошибки.</p></div></header><div class="parents">' +
      '<label>Список призов, каждый с новой строки<textarea data-prizes>' + esc(teacher.prizes.join('\n')) + '</textarea></label>' +
      WORLDS.map((world) => {
        const chosen = teacher.assign[world.id]
        return '<label>' + world.title + '<select data-assign="' + world.id + '"><option value="random">Случайный</option>' +
          teacher.prizes.map((prize, index) => '<option value="' + index + '"' + (chosen === index ? ' selected' : '') + '>' +
            esc(prize) + '</option>').join('') + '</select></label>'
      }).join('') +
      '<button type="button" data-save-teacher>Сохранить призы</button>' +
      '<h2>Ученики</h2><div class="book-tabs">' +
      '<button type="button" data-student="">Класс</button>' +
      teacher.students.map((student) => '<button type="button" data-student="' + esc(student.id) + '">' + esc(student.name) + '</button>').join('') +
      '</div><input data-new-name maxlength="16" placeholder="Имя ученика"/>' +
      '<button type="button" data-add-student>Добавить и переключить</button>' +
      '<button type="button" data-reset-student>Сбросить прогресс этого профиля</button>' +
      '<h2>Статистика</h2>' +
      WORLDS.map((world) => {
        const stats = masteryOf(world.id, data)
        const weak = stats.weak.slice(0, 3).map((entry) => entry.title).join(', ')
        const prize = data.prizes?.[world.id]
        return '<article><b>' + world.title + '</b><p>Уровни ' + clearedOf(world.id) + '/3 · знания ' + stats.percent + '%' +
          (prize ? ' · приз: ' + esc(prize.title) : '') +
          (weak ? ' · ошибки: ' + esc(weak) : '') + '</p></article>'
      }).join('') + '</div>' + dock('teacher') + '</div>'
    app.querySelector('[data-save-teacher]').addEventListener('click', () => {
      const prizes = app.querySelector('[data-prizes]').value.split('\n').map((line) => line.trim()).filter(Boolean)
      const next = loadTeacher()
      next.prizes = prizes.length ? prizes : DEFAULT_PRIZES.slice()
      next.assign = {}
      app.querySelectorAll('[data-assign]').forEach((select) => {
        if (select.value !== 'random') next.assign[select.dataset.assign] = Number(select.value)
      })
      saveTeacher(next)
      app.querySelector('[data-save-teacher]').textContent = 'Сохранено'
    })
    app.querySelectorAll('[data-student]').forEach((btn) => btn.addEventListener('click', () => {
      switchStudent(btn.dataset.student)
    }))
    app.querySelector('[data-add-student]').addEventListener('click', () => {
      const name = app.querySelector('[data-new-name]').value.trim().slice(0, 16)
      if (!name) return
      const teacherNext = loadTeacher()
      const id = 's' + Date.now()
      teacherNext.students.push({ id, name })
      teacherNext.active = id
      saveTeacher(teacherNext)
      switchStudent(id)
    })
    app.querySelector('[data-reset-student]').addEventListener('click', () => {
      if (!window.confirm('Сбросить прогресс этого профиля? Призы можно получить снова.')) return
      data = reset()
      hero = 'sol'
      screen = 'pick'
      paint()
    })
    bindDock()
  }

  function paintChest() {
    const world = WORLDS.find((item) => item.id === focusWorld)
    const prize = load().prizes?.[focusWorld]
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Приз темы</h1></div></header>' +
      '<div class="island-wrap"><canvas data-chest></canvas></div>' +
      '<div class="summary chest-card"><b>' + esc(world.title) + '</b><p>' + esc(playerName()) + '</p><p>Приз: ' +
      esc(prize?.title || '') + '</p><p>' + esc(prize?.date || '') + '</p>' +
      '<button type="button" data-cert>Сохранить сертификат</button>' +
      '<button type="button" data-back>Дальше</button></div></div>'
    const canvas = app.querySelector('[data-chest]')
    const stage = createStage(canvas, { sky: 0x1e1b4b, fog: 0x312e81, cam: [0, 2.4, 5.5] })
    const chest = new THREE.Group()
    const box = mesh(geo('chest', () => new THREE.BoxGeometry(1.1, 0.7, 0.7)), mat(0xf59e0b, { metalness: 0.3 }), 0, 0.4, 0)
    const lid = mesh(geo('lid', () => new THREE.BoxGeometry(1.14, 0.18, 0.74)), mat(0xfbbf24), 0, 0.85, 0)
    chest.add(box, lid)
    chest.position.y = 6
    stage.scene.add(chest)
    gsap.to(chest.position, { y: 0, duration: 1.1, ease: 'bounce.out', onComplete: () => gsap.to(lid.rotation, { x: -1.2, duration: 0.6 }) })
    let frame = 0
    let alive = true
    function tick() {
      if (!alive) return
      frame = requestAnimationFrame(tick)
      stage.resize()
      stage.render()
    }
    frame = requestAnimationFrame(tick)
    chestDestroy = () => { alive = false; cancelAnimationFrame(frame); stage.dispose() }
    app.querySelector('[data-cert]').addEventListener('click', () => {
      downloadCertificate({ world: world.title, name: data.name || 'Ученик', prize: prize.title, date: prize.date })
    })
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'summary'; paint() })
  }

  function givePrize(id) {
    data = load()
    if (data.prizes?.[id]) {
      focusWorld = id
      screen = 'chest'
      paint()
      return
    }
    const title = prizeFor(id)
    const date = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Bishkek' })
    data.prizes = { ...(data.prizes || {}), [id]: { title, date, name: data.name || 'Ученик' } }
    data.crystals += 4
    write(data)
    focusWorld = id
    summaryId = id
    screen = 'chest'
    paint()
  }

  function switchStudent(id) {
    if (id) localStorage.setItem('pg-active-student', id)
    else localStorage.removeItem('pg-active-student')
    const teacher = loadTeacher()
    teacher.active = id || ''
    saveTeacher(teacher)
    data = load()
    hero = data.hero || 'sol'
    pet = data.pet || 'firefly'
    screen = data.hero ? 'teacher' : 'pick'
    paint()
  }

  async function enter(id, level) {
    audioContext()
    closeExtra()
    summaryId = id
    focusWorld = id
    enteredAt = performance.now()
    history.pushState({ pg: 'world', id, level }, '')
    app.innerHTML = '<div class="hub"><p class="hub-note" style="padding:24px">Собираем мир…</p></div>'
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
    if (worldHandle) worldHandle.destroy()
    worldHandle = null
    if (id === 'trial') {
      if (result.win) {
        data.crystals += 3
        write(data)
      }
      showRecapOrMap()
      return
    }
    const prev = data.worlds[id] || { stars: 0, win: false, cleared: 0 }
    const stars = Math.max(prev.stars || 0, result.stars || 0)
    const cleared = result.win ? Math.max(prev.cleared || 0, level) : (prev.cleared || 0)
    const firstWin = result.win && !prev.win
    data.worlds[id] = { stars, win: prev.win || !!result.win, cleared }
    if (firstWin) data.crystals += 6
    data.knowStars[id] = Math.max(data.knowStars[id] || 0, masteryOf(id, data).stars)
    write(data)
    if (result.next && result.win && level < 3) {
      enter(id, level + 1)
      return
    }
    if (result.win && cleared >= 3 && !data.prizes?.[id]) {
      givePrize(id)
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

  function dock(active) {
    const items = [
      ['worlds', 'Миры'],
      ['book', 'Энциклопедия'],
      ['trial', 'Испытание'],
      ['hero', 'Герой'],
      ['rewards', 'Награды'],
      ['teacher', 'Для учителя']
    ]
    return '<nav class="dock">' + items.map(([id, title]) =>
      '<button type="button" data-dock="' + id + '"' + (id === active ? ' class="on"' : '') + '>' + title + '</button>'
    ).join('') + '</nav>'
  }

  function bindDock() {
    app.querySelectorAll('[data-dock]').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.dock
      if (id === 'worlds') screen = 'map'
      else if (id === 'book') screen = 'album'
      else if (id === 'hero') screen = 'pick'
      else if (id === 'rewards') screen = 'rewards'
      else if (id === 'teacher') screen = 'teacher'
      else if (id === 'trial') {
        enter('trial', 1)
        return
      }
      paint()
    }))
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
  function clearedOf(id) {
    return Math.min(3, data.worlds[id]?.cleared || 0)
  }

  paint()
}

function ending(name) {
  if (!name) return ''
  return ', ' + esc(name)
}
