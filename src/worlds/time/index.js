/* Машина времени: лови события своей эпохи сачком, пока портал не закрылся.
   В бою босса события ловятся строго по году — следующий год написан на котле. */
import Phaser from 'phaser'
import gsap from 'gsap'
import { audioContext, beep, isMuted, loop, toggleMute } from '../../audio.js'
import { itemById, itemsOf } from '../../data/curriculum.js'
import { award, fault, mentor, mountChrome, endMarkup, bindEnd, requestExit } from '../../shell/shell.js'
import './style.css'

const ERAS = [
  {
    name: 'Древняя Русь',
    sky: 0x1e3a8a,
    goods: [
      { id: 'y988', label: '988  Крещение Руси' },
      { id: 'y988', label: 'Летопись' }
    ]
  },
  {
    name: 'Москва и империя',
    sky: 0x7f1d1d,
    goods: [
      { id: 'y1380', label: '1380  Куликово поле' },
      { id: 'y1612', label: '1612  Ополчение' },
      { id: 'y1703', label: '1703  Петербург' }
    ]
  },
  {
    name: 'Новое время',
    sky: 0x365314,
    goods: [
      { id: 'y1812', label: '1812  Отечественная война' },
      { id: 'y1861', label: '1861  Свобода крестьян' },
      { id: 'y1945', label: '1945  День Победы' },
      { id: 'y1961', label: '1961  Гагарин' }
    ]
  }
]

const FAKES = ['Динозавр в метро', 'Телефон князя', 'Ракета в 988']

const BOSS_ORDER = [
  { id: 'y988', label: '988  Крещение Руси' },
  { id: 'y1380', label: '1380  Куликово поле' },
  { id: 'y1703', label: '1703  Петербург' },
  { id: 'y1961', label: '1961  Гагарин' }
]

let live = null

class TimeScene extends Phaser.Scene {
  constructor() { super('time') }

  create() {
    live = this
    this.hub = this.game.registry.get('hub')
    this.root = this.game.registry.get('root')
    this.level = this.hub.level || 1
    this.basket = this.hub.hero.bonus === 'speed' ? 200 : 150
    this.x = 480
    this.items = []
    this.era = this.level >= 4 ? 0 : Math.min(2, this.level - 1)
    this.caught = 0
    this.need = 3
    this.hp = 4
    this.miss = 0
    this.boss = false
    this.bossStep = 0
    this.spawnIn = 0.6
    this.over = ''
    this.boss = this.level >= 5
    this.queue = this.buildQueue(this.era)
    this.input.on('pointermove', (pointer) => { this.x = pointer.x })
    this.input.on('pointerdown', (pointer) => { this.x = pointer.x })
    this.net = this.add.graphics()
    const decor = this.add.graphics()
    decor.fillStyle(0xfbbf24, 1)
    decor.fillCircle(70, 430, 28)
    decor.fillStyle(0x451a03, 1)
    decor.fillCircle(70, 430, 10)
    decor.fillRect(64, 250, 12, 160)
    decor.fillStyle(0xfef3c7, 1)
    decor.fillRoundedRect(40, 180, 70, 50, 8)
    this.root.querySelector('.time-end').hidden = true
    this.applyEra()
    this.sync()
  }

  buildQueue(index) {
    const era = ERAS[index]
    const lessons = itemsOf('time').filter((entry) => entry.level === this.level)
    const source = lessons.length
      ? lessons.map((entry) => ({ id: entry.id, label: entry.title }))
      : era.goods
    const goods = source.slice(0, 3).map((item) => ({ ...item, good: true }))
    const bads = FAKES.map((label) => ({ id: 'fake', label, good: false }))
    const mix = []
    goods.forEach((item, i) => {
      mix.push(item)
      mix.push({ ...bads[i % bads.length], xSide: item.label.length })
    })
    return mix
  }

  applyEra() {
    const era = ERAS[this.era] || ERAS[0]
    this.cameras.main.setBackgroundColor(this.boss ? 0x111827 : era.sky)
    this.say(this.boss ? 'Босс путает годы. Лови их по порядку.' : 'Эпоха: ' + era.name + '. Лови свои события.')
    if (this.boss) {
      const lesson = itemById('timeline')
      if (lesson) mentor(this.root, lesson.mentor)
    }
  }

  update(_time, delta) {
    if (this.over || this.root.dataset.ready !== '1') return
    const dt = Math.min(0.05, delta / 1000)
    this.spawnIn -= dt
    if (this.spawnIn <= 0 && this.items.length === 0) this.dropNext()
    this.items.forEach((item) => {
      item.y += 150 * dt
      if (item.y > 470 && Math.abs(item.x - this.x) < this.basket / 2) this.catchItem(item)
      else if (item.y > 530) {
        item.dead = true
        item.text.destroy()
      }
    })
    this.items = this.items.filter((item) => !item.dead)
    this.draw()
    this.sync()
  }

  dropNext() {
    if (this.boss) {
      if (this.bossStep >= BOSS_ORDER.length) return
      const good = BOSS_ORDER[this.bossStep]
      const fake = BOSS_ORDER[(this.bossStep + 1) % BOSS_ORDER.length]
      const which = Math.random() < 0.65
      const card = which ? good : fake
      this.spawn(card.label, which, which ? good.id : 'fake', which ? 220 : 740)
      this.spawnIn = 1.15
      return
    }
    if (!this.queue.length) {
      if (this.caught < this.need) this.queue = this.buildQueue(this.era)
      else return
    }
    const card = this.queue.shift()
    const x = card.good ? 280 + Math.random() * 400 : (Math.random() < 0.5 ? 90 : 860)
    this.spawn(card.label, card.good, card.id, x)
    this.spawnIn = 1.05
  }

  spawn(label, good, id, x) {
    const text = this.add.text(x, -20, label, {
      fontFamily: 'Times New Roman, serif', fontSize: '20px', color: good ? '#fef3c7' : '#fecaca',
      backgroundColor: good ? '#92400e' : '#450a0a', padding: { x: 6, y: 4 }
    })
    text.setOrigin(0.5)
    this.items.push({ x, y: -20, good, id, label, text, dead: false })
  }

  catchItem(item) {
    item.dead = true
    item.text.destroy()
    if (item.good) {
      this.caught += 1
      if (item.id !== 'fake') {
        award(this.root, this.hub, item.id)
        const card = itemById(item.id)
        if (card) {
          mentor(this.root, card.mentor)
          this.say(card.because)
        }
      }
      beep(523, 0.08, 'triangle', 0.04)
      if (this.boss) {
        this.bossStep += 1
        if (this.bossStep === 1) award(this.root, this.hub, 'museum')
        if (this.bossStep >= BOSS_ORDER.length) {
          award(this.root, this.hub, 'time-boss')
          this.finish(true)
        }
      } else if (this.caught >= this.need) {
        if ((this.level || 1) >= 4 && (this.level || 1) < 5) {
          this.era += 1
          this.caught = 0
          if (this.era >= ERAS.length) this.finish(true)
          else {
            this.queue = this.buildQueue(this.era)
            this.applyEra()
          }
        } else {
          this.finish(true)
        }
      }
    } else {
      this.hp -= 1
      this.miss += 1
      this.cameras.main.shake(100, 0.01)
      fault(this.root, this.hub, this.boss ? 'timeline' : 'century')
      this.say('Это из другой эпохи. Портал сузился.')
      beep(140, 0.12, 'sawtooth', 0.04)
      if (this.hp <= 0) this.finish(false)
    }
  }

  draw() {
    const g = this.net
    g.clear()
    g.fillStyle(0xfbbf24, 1)
    g.fillRoundedRect(this.x - this.basket / 2, 486, this.basket, 18, 8)
    g.fillRect(this.x - 4, 470, 8, 20)
    this.items.forEach((item) => { item.text.y = item.y })
  }

  finish(victory) {
    if (this.over) return
    this.over = victory ? 'win' : 'lose'
    const stars = this.miss <= 1 ? 3 : this.miss <= 3 ? 2 : 1
    const end = this.root.querySelector('.time-end')
    end.hidden = false
    end.dataset.worldResult = victory ? 'win' : 'lose'
    end.innerHTML = endMarkup(
      victory ? 'Портал заперт' : 'Портал мигнул',
      victory ? 'Звёзды: ' + stars + '. События встали по годам.' : 'Шестерёнки целы. Можно завести машину снова.',
      victory,
      this.level
    )
    bindEnd(end, this.hub, { win: victory, stars: victory ? stars : 0, retry: () => this.scene.restart() })
  }

  say(text) {
    const node = this.root.querySelector('.time-speech')
    if (node) node.textContent = text
  }

  sync() {
    const meter = this.root.querySelector('.portal-meter b')
    if (meter) {
      const total = this.boss ? this.bossStep / BOSS_ORDER.length : (this.era + this.caught / this.need) / ERAS.length
      meter.style.width = Math.min(100, total * 100) + '%'
    }
    window.__guardian = {
      world: 'time',
      over: this.over,
      hp: this.hp,
      boss: this.boss,
      items: this.items.filter((item) => !item.dead).map((item) => ({
        x: item.x, y: item.y, good: item.good, label: item.label
      }))
    }
  }
}

export function mount(root, hub) {
  audioContext()
  const stopMusic = loop(500, (tick) => {
    beep(880, 0.03, 'square', 0.02)
    if (tick % 2 === 0) beep([262, 311, 349, 415][tick % 4], 0.25, 'triangle', 0.025)
  })
  root.innerHTML =
    '<section class="world-time">' +
    '<header class="time-top"><div><h1>Машина времени</h1><p class="time-speech">Профессор Тик заводит котёл.</p></div>' +
    '<div class="portal-meter"><b></b></div><button type="button" class="time-mute" data-mute>' +
    (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="time-stage" data-view></div>' +
    '<footer class="time-bottom">Веди сачок пальцем по экрану.</footer>' +
    '<div class="time-splash"><div><h2>Завод часов</h2><p>Лови события своей эпохи. Чужое сужает портал.</p></div></div>' +
    '<div class="time-end" hidden></div></section>'
  const host = root.querySelector('.world-time')
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })
  let game = null
  const chrome = mountChrome(host, {
    pause: () => game && game.scene.pause('time'),
    resume: () => game && game.scene.resume('time'),
    retry: () => game && game.scene.getScene('time')?.scene.restart(),
    exit: () => requestExit(host, hub),
    muted: isMuted,
    toggleSound: toggleMute
  })
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.querySelector('[data-view]'),
    width: 960,
    height: 540,
    backgroundColor: '#1e3a8a',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: TimeScene,
    callbacks: {
      preBoot(instance) {
        instance.registry.set('hub', hub)
        instance.registry.set('root', host)
      }
    }
  })
  gsap.to(host.querySelector('.time-splash'), {
    opacity: 0, delay: 0.7, duration: 0.3,
    onComplete: () => {
      host.querySelector('.time-splash').hidden = true
      host.dataset.ready = '1'
    }
  })
  return {
    destroy() {
      chrome.destroy()
      stopMusic()
      live = null
      game.destroy(true)
    }
  }
}
