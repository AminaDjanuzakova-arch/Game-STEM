/* Эко-патруль: быстрая аркада. Мусор вспыхивает в центре, его надо
   отправить в свой бак до конца фитиля. Комбо ускоряет смену. */
import Phaser from 'phaser'
import gsap from 'gsap'
import { audioContext, beep, isMuted, loop, toggleMute } from '../../audio.js'
import { itemById } from '../../data/curriculum.js'
import { award, fault, mentor, mountChrome, endMarkup, bindEnd, requestExit } from '../../shell/shell.js'
import './style.css'

const KINDS = [
  { id: 'paper', bin: 'paper', fact: 'eco-paper', title: 'Газета', level: 1, color: 0x60a5fa },
  { id: 'draft', bin: 'paper', fact: 'eco-save', title: 'Черновик', level: 1, color: 0x93c5fd },
  { id: 'plastic', bin: 'plastic', fact: 'eco-plastic', title: 'Бутылка', level: 1, color: 0xfacc15 },
  { id: 'glass', bin: 'glass', fact: 'eco-glass', title: 'Банка', level: 2, color: 0x4ade80 },
  { id: 'food', bin: 'food', fact: 'eco-food', title: 'Огрызок', level: 2, color: 0xfb923c },
  { id: 'leaf', bin: 'food', fact: 'eco-oxygen', title: 'Листва', level: 2, color: 0x16a34a },
  { id: 'hazard', bin: 'hazard', fact: 'eco-hazard', title: 'Батарейка', level: 3, color: 0xfb7185 },
  { id: 'lamp', bin: 'hazard', fact: 'eco-lamp', title: 'Лампа', level: 3, color: 0xf9a8d4 },
  { id: 'animal', bin: 'animal', fact: 'eco-animal', title: 'Птенец', level: 3, color: 0xa78bfa },
  { id: 'bag', bin: 'plastic', fact: 'eco-water', title: 'Пакет у реки', level: 4, color: 0x38bdf8 },
  { id: 'peel', bin: 'food', fact: 'eco-cycle', title: 'Очистки', level: 4, color: 0xd97706 },
  { id: 'smoke', bin: 'hazard', fact: 'eco-air', title: 'Дымная куча', level: 4, color: 0x64748b },
  { id: 'rare', bin: 'animal', fact: 'eco-redbook', title: 'Редкая птица', level: 5, color: 0xf472b6 },
  { id: 'sign', bin: 'animal', fact: 'eco-reserve', title: 'Знак заповедника', level: 5, color: 0x15803d }
]

let live = null

class EcoScene extends Phaser.Scene {
  constructor() { super('eco') }

  create() {
    live = this
    this.hub = this.game.registry.get('hub')
    this.root = this.game.registry.get('root')
    this.level = this.hub.level || 1
    this.pool = KINDS.filter((kind) => kind.level === this.level || (this.level >= 5 && kind.level >= 4))
    this.combo = 0
    this.best = 0
    this.done = 0
    this.dirt = 0
    this.miss = 0
    this.boss = false
    this.ttl = 0
    this.maxTtl = 2.4
    this.item = null
    this.seen = {}
    this.over = ''
    this.order = this.deal(this.level >= 5 ? 8 : 6)
    this.cameras.main.setBackgroundColor('#e0f2fe')
    this.gfx = this.add.graphics()
    this.robot = this.drawRobot()
    this.root.querySelector('.eco-end').hidden = true
    this.nextItem()
    this.sync()
  }

  deal(count) {
    const list = []
    const pool = this.pool.length ? this.pool : KINDS
    for (let i = 0; i < count; i += 1) list.push(pool[i % pool.length])
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const swap = list[i]
      list[i] = list[j]
      list[j] = swap
    }
    return list
  }

  drawRobot() {
    const g = this.add.graphics()
    g.fillStyle(0xf472b6, 1)
    g.fillRoundedRect(430, 250, 100, 80, 16)
    g.fillStyle(0x111827, 1)
    g.fillRect(450, 270, 60, 22)
    g.fillStyle(0x4ade80, 1)
    g.fillCircle(466, 281, 4)
    g.fillCircle(494, 281, 4)
    return g
  }

  nextItem() {
    if (this.over) return
    if (!this.order.length) {
      if (this.level >= 5 && !this.boss) {
        this.boss = true
        this.order = this.deal(6)
        const lesson = itemById('eco-boss')
        if (lesson) mentor(this.root, lesson.mentor)
        award(this.root, this.hub, 'eco-boss')
        this.say('Босс — мусорный вихрь! Фитиль короче, бак всё равно свой.')
      } else {
        this.finish(true)
        return
      }
    }
    const kind = this.order.shift()
    this.item = kind
    this.maxTtl = (this.boss ? 1.35 : 2.3) + (this.hub.hero.bonus === 'shield' ? 0.25 : 0)
    this.ttl = this.maxTtl
    this.sync()
  }

  sort(bin) {
    if (this.over || !this.item) return
    const ok = bin === this.item.bin
    if (ok) {
      this.combo += 1
      this.best = Math.max(this.best, this.combo)
      this.done += 1
      beep(520 + this.combo * 30, 0.06, 'square', 0.04)
      if (!this.seen[this.item.id]) {
        this.seen[this.item.id] = true
        award(this.root, this.hub, this.item.fact)
        const card = itemById(this.item.fact)
        if (card) mentor(this.root, card.mentor)
        this.say(card ? card.because : this.item.title)
      } else if (this.combo % 3 === 0) {
        this.say('Комбо ' + this.combo + '! Знание ускоряет руки.')
      }
      this.cameras.main.flash(80, 255, 255, 255)
      this.nextItem()
    } else {
      this.combo = 0
      this.dirt += 1
      this.miss += 1
      this.cameras.main.shake(80, 0.01)
      beep(120, 0.1, 'sawtooth', 0.04)
      fault(this.root, this.hub, this.item.fact)
      this.say(this.item.bin === 'animal'
        ? 'Живое не бросают в мусор. Ему нужна помощь.'
        : 'Это не тот бак. ' + this.item.title + ' едет в свой цвет.')
      if (this.dirt >= 5) this.finish(false)
    }
    this.sync()
  }

  update(_time, delta) {
    if (this.over || !this.item || this.root.dataset.ready !== '1') return
    const dt = Math.min(0.05, delta / 1000)
    this.ttl -= dt * (1 + Math.min(this.combo, 8) * 0.04)
    if (this.ttl <= 0) {
      this.combo = 0
      this.dirt += 1
      this.miss += 1
      this.say('Фитиль сгорел. ' + this.item.title + ' уплыл по реке.')
      if (this.dirt >= 5) this.finish(false)
      else this.nextItem()
    }
    this.paint()
    this.sync()
  }

  paint() {
    const g = this.gfx
    g.clear()
    if (!this.item) return
    g.fillStyle(this.item.color, 1)
    g.fillRoundedRect(430, 150, 100, 80, 16)
    const ratio = Math.max(0, this.ttl / this.maxTtl)
    g.lineStyle(8, 0x111827, 1)
    g.beginPath()
    g.arc(480, 140, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
    g.strokePath()
  }

  finish(victory) {
    if (this.over) return
    this.over = victory ? 'win' : 'lose'
    const stars = this.miss <= 1 ? 3 : this.miss <= 4 ? 2 : 1
    const end = this.root.querySelector('.eco-end')
    end.hidden = false
    end.dataset.worldResult = victory ? 'win' : 'lose'
    end.innerHTML = endMarkup(
      victory ? 'Река чистая' : 'Река помутнела',
      victory ? 'Звёзды: ' + stars + '. Лучшее комбо ' + this.best + '.' : 'Бак никуда не делся. Можно разогнаться снова.',
      victory,
      this.level
    )
    bindEnd(end, this.hub, { win: victory, stars: victory ? stars : 0, retry: () => this.scene.restart() })
  }

  say(text) {
    const node = this.root.querySelector('.eco-speech')
    if (node) node.textContent = text
  }

  sync() {
    const combo = this.root.querySelector('[data-combo]')
    if (combo) combo.textContent = 'Комбо ' + this.combo
    const label = this.root.querySelector('[data-item]')
    if (label) label.textContent = this.item ? this.item.title : 'Чисто'
    window.__guardian = {
      world: 'eco',
      over: this.over,
      bin: this.item ? this.item.bin : '',
      dirt: this.dirt,
      done: this.done,
      boss: this.boss
    }
  }
}

export function mount(root, hub) {
  audioContext()
  const stopMusic = loop(160, (tick) => {
    beep([523, 659, 784, 659, 880, 784][tick % 6], 0.1, 'square', 0.03)
  })
  const bins = [
    ['paper', 'Бумага'],
    ['plastic', 'Пластик'],
    ['glass', 'Стекло'],
    ['food', 'Еда'],
    ['hazard', 'Опасное'],
    ['animal', 'Живое']
  ]
  root.innerHTML =
    '<section class="world-eco">' +
    '<header class="eco-top"><div><h1>Эко-патруль</h1><p class="eco-speech">Робот Шустрик включает щётки.</p></div>' +
    '<b data-item>Мусор</b><b data-combo>Комбо 0</b><button type="button" class="eco-mute" data-mute>' +
    (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="eco-stage" data-view></div>' +
    '<footer class="bins">' + bins.map(([id, label]) =>
      '<button type="button" class="bin-' + id + '" data-bin="' + id + '">' + label + '</button>'
    ).join('') + '</footer>' +
    '<div class="eco-splash"><div><h2>Смена</h2><p>Жми бак, пока горит фитиль. Комбо разгоняет смену.</p></div></div>' +
    '<div class="eco-end" hidden></div></section>'
  const host = root.querySelector('.world-eco')
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })
  host.querySelectorAll('[data-bin]').forEach((btn) => btn.addEventListener('click', () => {
    if (live) live.sort(btn.dataset.bin)
  }))
  let game = null
  const chrome = mountChrome(host, {
    pause: () => game && game.scene.pause('eco'),
    resume: () => game && game.scene.resume('eco'),
    retry: () => game && game.scene.getScene('eco')?.scene.restart(),
    exit: () => requestExit(host, hub),
    muted: isMuted,
    toggleSound: toggleMute
  })
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.querySelector('[data-view]'),
    width: 960,
    height: 540,
    backgroundColor: '#e0f2fe',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: EcoScene,
    callbacks: {
      preBoot(instance) {
        instance.registry.set('hub', hub)
        instance.registry.set('root', host)
      }
    }
  })
  gsap.from('.bins button', { y: 10, stagger: 0.04, duration: 0.25 })
  gsap.to(host.querySelector('.eco-splash'), {
    opacity: 0, delay: 0.6, duration: 0.3,
    onComplete: () => {
      host.querySelector('.eco-splash').hidden = true
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
