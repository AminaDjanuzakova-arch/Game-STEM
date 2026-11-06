/* Большой забег: автоматический бег, прыжок и скольжение.
   Зоны меняют фон. На финише босс-ворота: выбери зверя этой зоны, пока бежишь. */
import Phaser from 'phaser'
import gsap from 'gsap'
import { audioContext, beep, isMuted, loop, toggleMute } from '../../audio.js'
import { itemById, itemsOf } from '../../data/curriculum.js'
import { award, fault, mentor, mountChrome, endMarkup, bindEnd, requestExit } from '../../shell/shell.js'
import './style.css'

const GATES = [
  { fact: 'zone-arctic', label: 'Арктическая пустыня', lane: 0 },
  { fact: 'zone-tundra', label: 'Тундра', lane: 1 },
  { fact: 'zone-taiga', label: 'Тайга', lane: 2 },
  { fact: 'zone-steppe', label: 'Степь', lane: 1 }
]
const LANES = ['Белый медведь', 'Северный олень', 'Лось']

let live = null

class RusScene extends Phaser.Scene {
  constructor() { super('rus') }

  create() {
    live = this
    this.hub = this.game.registry.get('hub')
    this.root = this.game.registry.get('root')
    this.animal = null
    this.running = false
    this.dist = 0
    this.y = 390
    this.vy = 0
    this.ground = 390
    this.slide = 0
    this.air = 0
    this.hp = 4
    this.miss = 0
    this.level = this.hub.level || 1
    this.speed = 200 + this.level * 18
    this.jumpV = -620
    this.goal = 4600
    this.boss = false
    this.gate = 0
    this.gateTime = 1.5
    this.lane = 1
    this.over = ''
    this.events = []
    let at = 640
    const pattern = ['jump', 'slide', 'coin', 'jump', 'slide']
    const coins = itemsOf('russia').filter((entry) => entry.level === this.level).map((entry) => entry.id)
    const count = this.level >= 4 ? 8 : 4 + this.level
    for (let i = 0; i < count; i += 1) {
      const kind = pattern[i % pattern.length]
      this.events.push({ at, kind, fact: kind === 'coin' ? coins[i % Math.max(coins.length, 1)] || '' : '', done: false })
      at += 420
    }
    this.goal = at + 80
    this.sky = this.add.graphics()
    this.runner = this.add.container(220, this.y)
    this.paintRunner(0xf97316)
    this.redraw()
    this.root.querySelector('.rus-end').hidden = true
    this.sync()
  }

  paintRunner(color) {
    this.runner.removeAll(true)
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillRoundedRect(-18, -36, 36, 40, 10)
    g.fillStyle(0x111827, 1)
    g.fillCircle(-6, -22, 2)
    g.fillCircle(6, -22, 2)
    g.fillCircle(0, -48, 8)
    this.runner.add(g)
  }

  begin(animal) {
    this.animal = animal
    if (animal === 'hare') this.jumpV = -760
    if (animal === 'fox') this.speed = 280
    if (animal === 'bear') this.hp = 5
    const colors = { hare: 0xf8fafc, fox: 0xf97316, bear: 0x92400e }
    this.paintRunner(colors[animal] || 0xf97316)
    this.running = true
    this.say('Беги по зонам. Низкое — прыжок, высокое — скольжение.')
    this.root.querySelector('.pick-runner').hidden = true
  }

  jump() {
    if (!this.running || this.over) return
    if (this.boss) {
      this.lane = Math.max(0, this.lane - 1)
      return
    }
    if (this.y >= this.ground - 1) {
      this.vy = this.jumpV
      this.air = 0.85
      beep(420, 0.05, 'square', 0.03)
    }
  }

  doSlide() {
    if (!this.running || this.over) return
    if (this.boss) {
      this.lane = Math.min(2, this.lane + 1)
      return
    }
    if (this.slide <= 0 && this.y >= this.ground - 1) {
      this.slide = 0.72
      beep(200, 0.06, 'square', 0.03)
    }
  }

  pickLane(index) {
    this.lane = index
  }

  update(_time, delta) {
    if (!this.running || this.over) return
    const dt = Math.min(0.04, delta / 1000)
    this.slide = Math.max(0, this.slide - dt)
    this.air = Math.max(0, this.air - dt)
    if (this.boss) {
      this.gateTime -= dt
      if (this.gateTime <= 0) this.resolveGate()
      this.redraw()
      this.sync()
      return
    }
    this.vy += 1500 * dt
    this.y += this.vy * dt
    if (this.y > this.ground) {
      this.y = this.ground
      this.vy = 0
    }
    this.runner.y = this.y + (this.slide > 0 ? 16 : 0)
    this.runner.scaleY = this.slide > 0 ? 0.7 : 1
    this.dist += this.speed * dt
    this.events.forEach((obstacle) => {
      if (obstacle.done) return
      const rel = obstacle.at - this.dist
      if (rel < 24 && rel > -30) {
        obstacle.done = true
        if (obstacle.kind === 'coin') this.grab(obstacle)
        else if (obstacle.kind === 'jump' && this.air <= 0) this.hurt('Это низко. В следующий раз прыгай заранее.')
        else if (obstacle.kind === 'slide' && this.slide <= 0) this.hurt('Ветка сверху. Под ней скользят.')
        else beep(700, 0.04, 'square', 0.02)
      }
    })
    if (this.dist >= this.goal && !this.boss) {
      if (this.level >= 5) this.startBoss()
      else this.finish(true)
    }
    this.redraw()
    this.sync()
  }

  grab(obstacle) {
    if (!obstacle.fact) return
    award(this.root, this.hub, obstacle.fact)
    const card = itemById(obstacle.fact)
    if (card) mentor(this.root, card.mentor)
    this.say(card ? card.because : '')
    beep(640, 0.06, 'triangle', 0.03)
  }

  hurt(text) {
    this.hp -= 1
    this.miss += 1
    this.cameras.main.shake(120, 0.012)
    this.say(text)
    beep(110, 0.12, 'sawtooth', 0.05)
    if (this.hp <= 0) this.finish(false)
  }

  startBoss() {
    this.boss = true
    this.gateTime = 1.7
    this.say('Финишные ворота. ' + GATES[0].label + ': выбери зверя.')
  }

  resolveGate() {
    const gate = GATES[this.gate]
    if (this.lane === gate.lane) {
      award(this.root, this.hub, gate.fact)
      const card = itemById(gate.fact)
      this.say(card ? card.because : gate.label)
      beep(760, 0.08, 'square', 0.04)
      this.gate += 1
      if (this.gate >= GATES.length) {
        award(this.root, this.hub, 'rus-boss')
        this.finish(true)
        return
      }
    } else {
      fault(this.root, this.hub, gate.fact)
      this.hurt('Эти ворота ведут не в ту зону.')
      if (this.over) return
    }
    this.gateTime = 1.7
    if (!this.over) this.say('Дальше: ' + GATES[this.gate].label)
  }

  redraw() {
    const g = this.sky
    g.clear()
    const shift = this.dist / 40
    const biome = this.dist < 1200 ? 0xbae6fd : this.dist < 2400 ? 0x86efac : this.dist < 3600 ? 0xfde68a : 0xfed7aa
    g.fillStyle(biome, 1)
    g.fillRect(0, 0, 960, 540)
    g.fillStyle(0x166534, 1)
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 180 - shift * 8) % 1080 + 1080) % 1080 - 40
      g.fillTriangle(x, 400, x + 30, 300, x + 60, 400)
    }
    g.fillStyle(0x65a30d, 1)
    g.fillRect(0, 420, 960, 120)
    this.events.forEach((obstacle) => {
      if (obstacle.done) return
      const x = 220 + (obstacle.at - this.dist)
      if (x < -40 || x > 1000) return
      if (obstacle.kind === 'jump') {
        g.fillStyle(0xb45309, 1)
        g.fillRect(x, 380, 36, 40)
      } else if (obstacle.kind === 'slide') {
        g.fillStyle(0x166534, 1)
        g.fillRect(x, 300, 70, 16)
      } else {
        g.fillStyle(0xfbbf24, 1)
        g.fillCircle(x, 340, 12)
      }
    })
  }

  finish(victory) {
    if (this.over) return
    this.over = victory ? 'win' : 'lose'
    this.running = false
    const stars = this.miss <= 1 ? 3 : this.miss <= 3 ? 2 : 1
    const end = this.root.querySelector('.rus-end')
    end.hidden = false
    end.dataset.worldResult = victory ? 'win' : 'lose'
    end.innerHTML = endMarkup(
      victory ? 'Финиш на карте' : 'Привал',
      victory ? 'Звёзды: ' + stars + '. Зоны легли с севера на юг.' : 'Лапы заплелись. Тропа на месте.',
      victory,
      this.level
    )
    bindEnd(end, this.hub, {
      win: victory,
      stars: victory ? stars : 0,
      retry: () => {
        this.root.querySelector('.pick-runner').hidden = false
        this.scene.restart()
      }
    })
  }

  say(text) {
    const node = this.root.querySelector('.rus-speech')
    if (node) node.textContent = text
  }

  threat() {
    let best = null
    this.events.forEach((obstacle) => {
      if (obstacle.done || obstacle.kind === 'coin') return
      const dist = obstacle.at - this.dist
      if (dist < -20) return
      if (!best || dist < best.dist) best = { kind: obstacle.kind, dist }
    })
    return best
  }

  sync() {
    const hearts = this.root.querySelector('.hearts')
    if (hearts) {
      hearts.innerHTML = ''
      for (let i = 0; i < 5; i += 1) {
        if (i >= Math.max(this.hp, 0) && i >= 4 && this.animal !== 'bear') continue
        const bit = document.createElement('i')
        if (i >= this.hp) bit.className = 'off'
        if (i < (this.animal === 'bear' ? 5 : 4)) hearts.appendChild(bit)
      }
    }
    const lanes = this.root.querySelector('.lane-row')
    if (lanes) lanes.hidden = !this.boss
    window.__guardian = {
      world: 'russia',
      over: this.over,
      running: this.running,
      boss: this.boss,
      lane: this.lane,
      need: this.boss && GATES[this.gate] ? GATES[this.gate].lane : null,
      threat: this.running && !this.boss ? this.threat() : null,
      hp: this.hp
    }
  }
}

export function mount(root, hub) {
  audioContext()
  const stopMusic = loop(220, (tick) => {
    beep([392, 440, 523, 440, 349, 392][tick % 6], 0.12, 'square', 0.03)
  })
  root.innerHTML =
    '<section class="world-russia">' +
    '<header class="rus-top"><div><h1>Большой забег</h1><p class="rus-speech">Выбери зверя и сорвись с места.</p></div>' +
    '<div class="hearts"></div><button type="button" class="rus-mute" data-mute>' + (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="rus-stage" data-view></div>' +
    '<footer class="rus-controls"><button type="button" data-jump>Прыжок</button><button type="button" class="alt" data-slide>Скольжение</button>' +
    '<div class="lane-row" hidden>' + LANES.map((name, index) =>
      '<button type="button" data-lane="' + index + '">' + name + '</button>'
    ).join('') + '</div></footer>' +
    '<div class="pick-runner"><button type="button" data-runner="hare">Заяц — выше прыжок</button>' +
    '<button type="button" data-runner="fox">Лиса — быстрее</button>' +
    '<button type="button" data-runner="bear">Медвежонок — крепче</button></div>' +
    '<div class="rus-splash" hidden></div><div class="rus-end" hidden></div></section>'
  const host = root.querySelector('.world-russia')
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })
  host.querySelector('[data-jump]').addEventListener('click', () => { if (live) live.jump() })
  host.querySelector('[data-slide]').addEventListener('click', () => { if (live) live.doSlide() })
  host.querySelectorAll('[data-lane]').forEach((btn) => btn.addEventListener('click', () => {
    if (live) live.pickLane(Number(btn.dataset.lane))
  }))
  host.querySelectorAll('[data-runner]').forEach((btn) => btn.addEventListener('click', () => {
    if (live) live.begin(btn.dataset.runner)
    host.dataset.ready = '1'
  }))
  let game = null
  const chrome = mountChrome(host, {
    pause: () => game && game.scene.pause('rus'),
    resume: () => game && game.scene.resume('rus'),
    retry: () => {
      host.querySelector('.pick-runner').hidden = false
      game && game.scene.getScene('rus')?.scene.restart()
    },
    exit: () => requestExit(host, hub),
    muted: isMuted,
    toggleSound: toggleMute
  })
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.querySelector('[data-view]'),
    width: 960,
    height: 540,
    backgroundColor: '#bae6fd',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: RusScene,
    callbacks: {
      preBoot(instance) {
        instance.registry.set('hub', hub)
        instance.registry.set('root', host)
      }
    }
  })
  gsap.from('.pick-runner button', { y: 12, opacity: 0, stagger: 0.08, duration: 0.3 })
  return {
    destroy() {
      chrome.destroy()
      stopMusic()
      live = null
      game.destroy(true)
    }
  }
}
