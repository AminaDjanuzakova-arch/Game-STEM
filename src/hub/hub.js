/* Карта-глобус, выбор хранителя и альбом. Игровые правила сюда не входят. */
import gsap from 'gsap'
import { load, write, reset, levelOf } from '../save.js'
import { CARDS } from '../rewards.js'
import { isMuted, toggleMute, audioContext } from '../audio.js'
import { HEROES, PETS, heroSvg, petSvg } from './cast.js'
import { mountGlobe } from './globe.js'
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
  let worldHandle = null
  let hero = data.hero || 'sol'
  let pet = data.pet || 'firefly'

  function paint() {
    if (globeDestroy) globeDestroy()
    globeDestroy = null
    if (screen === 'pick') paintPick()
    else if (screen === 'album') paintAlbum()
    else paintMap()
  }

  function paintPick() {
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Хранители планеты</h1>' +
      '<p>Хаос-король растащил знания по мирам. Выбери, кем будешь их возвращать.</p></div>' +
      muteButton() + '</header><section class="pick"><h2>Кто выходит на глобус?</h2>' +
      '<div class="hero-row">' + HEROES.map((item) =>
        '<button type="button" class="hero-card' + (item.id === hero ? ' on' : '') + '" data-hero="' + item.id + '">' +
        heroSvg(item.id) + '<b>' + item.name + '</b><span>' + item.trait + '. ' + item.line + '</span></button>'
      ).join('') + '</div><h2>Питомец</h2><div class="pet-row">' + PETS.map((item) =>
        '<button type="button" class="pet-card' + (item.id === pet ? ' on' : '') + '" data-pet="' + item.id + '">' +
        petSvg(item.id) + '<b>' + item.name + '</b><span>' + item.line + '</span></button>'
      ).join('') + '</div><button type="button" class="go" data-start>На глобус</button></section></div>'
    app.querySelectorAll('[data-hero]').forEach((btn) => btn.addEventListener('click', () => {
      hero = btn.dataset.hero
      paint()
    }))
    app.querySelectorAll('[data-pet]').forEach((btn) => btn.addEventListener('click', () => {
      pet = btn.dataset.pet
      paint()
    }))
    app.querySelector('[data-start]').addEventListener('click', () => {
      audioContext()
      data = write({ ...data, hero, pet })
      screen = 'map'
      paint()
    })
    bindMute()
    gsap.from('.hero-card', { y: 16, opacity: 0, stagger: 0.06, duration: 0.35 })
  }

  function paintMap() {
    data = load()
    const done = WORLDS.filter((world) => data.worlds[world.id]?.win).length
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Глобус хранителя</h1>' +
      '<p>' + heroName() + ' и ' + petName() + '</p></div><div class="hub-stat">' +
      '<span class="pill">Уровень ' + levelOf(data.crystals) + '</span>' +
      '<span class="pill">Кристаллы ' + data.crystals + '</span>' +
      '<span class="pill">Миры ' + done + '/7</span>' +
      '<button type="button" class="linkish" data-album>Альбом ' + data.cards.length + '</button>' +
      '<button type="button" class="linkish" data-repick>Герой</button>' +
      muteButton() + '</div></header>' +
      '<div class="hub-stage"><div class="globe-wrap"><canvas data-globe></canvas>' +
      '<div class="story">Семь порталов ведут в разные миры. В каждом свои правила, свой герой и свой босс.</div></div>' +
      '<div class="portal-grid">' + WORLDS.map((world) => {
        const stars = data.worlds[world.id]?.stars || 0
        return '<button type="button" class="portal ' + world.cls + (data.worlds[world.id]?.win ? ' done' : '') +
          '" data-portal="' + world.id + '"><i>' + world.emotion + '</i><b>' + world.title + '</b><small>' +
          (stars ? '★'.repeat(stars) : 'портал закрыт знаниями') + '</small></button>'
      }).join('') + '</div></div></div>'
    globeDestroy = mountGlobe(app.querySelector('[data-globe]'))
    app.querySelector('[data-album]').addEventListener('click', () => { screen = 'album'; paint() })
    app.querySelector('[data-repick]').addEventListener('click', () => { screen = 'pick'; paint() })
    app.querySelectorAll('[data-portal]').forEach((btn) => btn.addEventListener('click', () => enter(btn.dataset.portal)))
    bindMute()
    gsap.from('.portal', { scale: 0.92, opacity: 0, stagger: 0.04, duration: 0.3 })
  }

  function paintAlbum() {
    data = load()
    const ids = Object.keys(CARDS)
    app.innerHTML =
      '<div class="hub"><header class="hub-top"><div><h1>Альбом открытий</h1><p>' + data.cards.length +
      ' из ' + ids.length + '</p></div><button type="button" class="linkish" data-back>К глобусу</button>' +
      '<button type="button" class="linkish" data-reset>Сбросить прогресс</button>' + muteButton() +
      '</header><div class="album">' + ids.map((id) => {
        const known = data.cards.includes(id)
        const card = CARDS[id]
        return '<article class="' + (known ? '' : 'locked') + '"><h3>' + (known ? card.title : '???') +
          '</h3><p>' + (known ? card.text : 'Открытие прячется в одном из миров.') + '</p></article>'
      }).join('') + '</div></div>'
    app.querySelector('[data-back]').addEventListener('click', () => { screen = 'map'; paint() })
    app.querySelector('[data-reset]').addEventListener('click', () => {
      if (window.confirm('Стереть кристаллы, альбом и победы на этом компьютере?')) {
        data = reset()
        hero = 'sol'
        pet = 'firefly'
        screen = 'pick'
        paint()
      }
    })
    bindMute()
  }

  async function enter(id) {
    audioContext()
    if (globeDestroy) globeDestroy()
    globeDestroy = null
    const mod = await LOADERS[id]()
    const host = document.createElement('div')
    host.style.height = '100%'
    app.replaceChildren(host)
    worldHandle = await mod.mount(host, {
      hero: HEROES.find((item) => item.id === data.hero) || HEROES[0],
      pet: data.pet,
      discover(cardId) {
        data = load()
        if (!data.cards.includes(cardId) && CARDS[cardId]) {
          data.cards = data.cards.concat(cardId)
          data.crystals += 1
          write(data)
        }
      },
      finish(result) {
        data = load()
        const prev = data.worlds[id] || { stars: 0, win: false }
        const stars = Math.max(prev.stars || 0, result.stars || 0)
        const firstWin = result.win && !prev.win
        data.worlds[id] = { stars, win: prev.win || !!result.win }
        if (firstWin) data.crystals += 6
        write(data)
        if (worldHandle) worldHandle.destroy()
        worldHandle = null
        screen = 'map'
        paint()
      }
    })
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
  function heroName() {
    return (HEROES.find((item) => item.id === data.hero) || HEROES[0]).name
  }
  function petName() {
    return (PETS.find((item) => item.id === data.pet) || PETS[0]).name
  }

  paint()
}
