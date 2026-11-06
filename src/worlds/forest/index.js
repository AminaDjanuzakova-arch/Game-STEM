/* Лесная оборона: вид сверху, башни-звери.
   Лиса стреляет только рядом с зайцем, заяц — только рядом с травой.
   Неверная цепь вянет. Добавить зверя: допиши KIND и проверку link(). */
import Phaser from 'phaser'
import gsap from 'gsap'
import { audioContext, beep, isMuted, loop, toggleMute } from '../../audio.js'
import { cardById } from '../../rewards.js'
import './style.css'

function face(kind) {
  if (kind === 'hare') {
    return '<svg viewBox="0 0 64 36" width="48" height="28"><ellipse cx="32" cy="24" rx="16" ry="10" fill="#e7e5e4"/><path d="M22 20 18 4" stroke="#d6d3d1" stroke-width="4"/><path d="M42 20 46 4" stroke="#d6d3d1" stroke-width="4"/><circle cx="26" cy="22" r="2" fill="#292524"/><circle cx="36" cy="22" r="2" fill="#292524"/></svg>'
  }
  if (kind === 'fox') {
    return '<svg viewBox="0 0 64 36" width="48" height="28"><path d="M8 28 20 8l12 14 12-14 12 20z" fill="#f97316"/><circle cx="26" cy="22" r="2" fill="#431407"/><circle cx="40" cy="22" r="2" fill="#431407"/></svg>'
  }
  return '<svg viewBox="0 0 64 36" width="48" height="28"><ellipse cx="32" cy="26" rx="18" ry="7" fill="#4ade80"/><path d="M32 26 V6" stroke="#166534" stroke-width="3"/><circle cx="32" cy="8" r="4" fill="#bbf7d0"/><circle cx="30" cy="8" r="1" fill="#14532d"/></svg>'
}

const KIND = {
  grass: { cost: 20, dmg: 7, title: 'Трава', fact: 'chain-grass' },
  hare: { cost: 30, dmg: 9, title: 'Заяц', fact: 'chain-hare' },
  fox: { cost: 40, dmg: 12, title: 'Лиса', fact: 'chain-fox' }
}

let live = null

class ForestScene extends Phaser.Scene {
  constructor() { super('forest') }

  create() {
    live = this
    this.hub = this.game.registry.get('hub')
    this.root = this.game.registry.get('root')
    this.money = 100 + (this.hub.hero.bonus === 'hp' ? 20 : 0)
    this.den = 5
    this.wave = 0
    this.running = false
    this.blobs = []
    this.spawnLeft = 0
    this.spawnEvery = 0.85
    this.buff = 0
    this.coolMap = {}
    this.miss = 0
    this.over = ''
    this.seedNote = ''
    this.root.querySelectorAll('[data-plot]').forEach((node) => {
      delete node.dataset.kind
      node.innerHTML = 'Поляна'
      node.classList.remove('live', 'wilt')
    })
    this.root.querySelector('.forest-end').hidden = true
    this.cameras.main.setBackgroundColor('#d9f99d')
    const g = this.add.graphics()
    g.fillStyle(0xbbf7d0, 1)
    g.fillRect(0, 0, 960, 540)
    g.fillStyle(0x86efac, 1)
    g.fillEllipse(120, 80, 220, 50)
    g.fillEllipse(780, 60, 260, 60)
    g.fillStyle(0x166534, 1)
    for (let i = 0; i < 7; i += 1) {
      const x = 70 + i * 130
      g.fillTriangle(x, 200, x + 28, 120, x + 56, 200)
      g.fillRect(x + 22, 200, 12, 28)
    }
    g.fillStyle(0x65a30d, 1)
    g.fillRoundedRect(40, 250, 880, 64, 30)
    g.fillStyle(0xfde68a, 1)
    g.fillCircle(860, 282, 26)
    g.fillStyle(0x14532d, 1)
    g.fillCircle(852, 276, 3)
    g.fillCircle(868, 276, 3)
    this.path = g
    const dot = this.make.graphics({ add: false })
    dot.fillStyle(0x166534)
    dot.fillCircle(4, 4, 4)
    dot.generateTexture('leaf', 8, 8)
    this.sync()
  }

  update(_time, delta) {
    if (this.over) return
    const dt = Math.min(0.05, delta / 1000)
    this.buff = Math.max(0, this.buff - dt)
    if (!this.running) return
    if (this.spawnLeft > 0) {
      this.spawnEvery -= dt
      if (this.spawnEvery <= 0) {
        this.spawnEvery = this.wave === 3 ? 0.55 : 0.9
        this.spawnLeft -= 1
        this.spawnBlob(this.wave === 3 && this.spawnLeft === 0 ? 'boss' : 'slime')
      }
    }
    const towers = this.towers().filter((tower) => this.linked(tower))
    this.blobs.forEach((blob) => {
      if (!blob.alive) return
      blob.x += (this.wave === 3 ? 70 : 56) * dt
      blob.sprite.x = blob.x
      if (blob.x > 860) {
        blob.alive = false
        blob.sprite.destroy()
        this.den -= blob.kind === 'boss' ? 3 : 1
        this.miss += 1
        this.cameras.main.shake(120, 0.01)
        this.say('Пятно дошло до дупла. Цепь не сдержала его.')
        if (this.den <= 0) this.finish(false)
      }
    })
    towers.forEach((tower) => {
      const cool = (this.coolMap[tower.plot] || 0) - dt
      if (cool > 0) {
        this.coolMap[tower.plot] = cool
        return
      }
      const target = this.blobs.find((blob) => blob.alive && blob.x > 80 && blob.x < 820)
      if (!target) return
      const power = (this.buff > 0 ? 1.4 : 1) * KIND[tower.kind].dmg
      target.hp -= power
      this.coolMap[tower.plot] = 0.42
      this.burst(target.x, 264)
      if (target.hp <= 0) {
        target.alive = false
        target.sprite.destroy()
        beep(640, 0.05, 'sine', 0.03)
        if (Math.random() < 0.25) this.grantBuff()
      }
    })
    this.blobs = this.blobs.filter((blob) => blob.alive)
    if (this.running && this.spawnLeft <= 0 && this.blobs.length === 0) {
      this.running = false
      if (this.wave >= 3) this.finish(true)
      else this.time.delayedCall(700, () => this.startWave())
    }
    this.sync()
  }

  spawnBlob(kind) {
    const hp = kind === 'boss' ? 220 : 16 + this.wave * 6
    const sprite = this.add.container(40, 264)
    const face = this.add.graphics()
    face.fillStyle(kind === 'boss' ? 0x3f3f46 : 0x64748b, 0.9)
    face.fillCircle(0, 0, kind === 'boss' ? 26 : 16)
    face.fillStyle(0xffffff, 1)
    face.fillCircle(-6, -4, 3)
    face.fillCircle(6, -4, 3)
    sprite.add(face)
    this.blobs.push({ x: 40, hp, kind, alive: true, sprite })
  }

  burst(x, y) {
    const emitter = this.add.particles(x, y, 'leaf', {
      speed: 80, lifespan: 300, quantity: 4, scale: { start: 1, end: 0 }, emitting: false
    })
    emitter.explode(4)
    this.time.delayedCall(350, () => emitter.destroy())
  }

  grantBuff() {
    this.buff = 4
    this.hub.discover('chain-rot')
    const card = cardById('chain-rot')
    this.say(card.text)
    beep(520, 0.08, 'triangle', 0.04)
  }

  towers() {
    return [...this.root.querySelectorAll('[data-plot]')].map((node) => ({
      plot: Number(node.dataset.plot),
      kind: node.dataset.kind || '',
      cool: Number(node.dataset.cool || 0),
      node
    })).filter((tower) => tower.kind)
  }

  linked(tower) {
    const row = tower.plot < 3 ? 0 : 1
    const near = (kind) => this.towers().some((other) =>
      other.kind === kind && Math.floor(other.plot / 3) === row && Math.abs(other.plot - tower.plot) === 1
    )
    if (tower.kind === 'grass') return true
    if (tower.kind === 'hare') return near('grass')
    return this.towers().some((other) =>
      other.kind === 'hare' && Math.abs(other.plot - tower.plot) === 1 && Math.floor(other.plot / 3) === row &&
      this.towers().some((grass) => grass.kind === 'grass' && Math.abs(grass.plot - other.plot) === 1 && Math.floor(grass.plot / 3) === row)
    )
  }

  place(plot, kind) {
    if (this.over || this.running) return
    const info = KIND[kind]
    if (!info) return
    const node = this.root.querySelector('[data-plot="' + plot + '"]')
    if (node.dataset.kind === kind) return
    if (this.money < info.cost) {
      this.say('Семечек не хватает. Волна принесёт передышку, но сейчас выбери дешевле.')
      return
    }
    if (node.dataset.kind) this.money += KIND[node.dataset.kind].cost
    this.money -= info.cost
    node.dataset.kind = kind
    node.dataset.cool = '0'
    const ok = this.linked({ plot: Number(plot), kind })
    node.classList.toggle('live', ok)
    node.classList.toggle('wilt', !ok)
    node.innerHTML = face(kind) + '<span>' + info.title + (ok ? '' : ' вянет') + '</span>'
    if (!ok) {
      this.miss += 1
      this.say(kind === 'fox'
        ? 'Лиса не стоит в начале. Сначала трава, потом заяц, и только потом лиса.'
        : 'Зайцу нужна трава на соседней поляне.')
      beep(180, 0.15, 'triangle', 0.04)
    } else {
      this.hub.discover(info.fact)
      const card = cardById(info.fact)
      this.say(card.text)
      beep(520, 0.08, 'sine', 0.04)
    }
    this.paintLinks()
    this.sync()
  }

  paintLinks() {
    this.root.querySelectorAll('[data-plot]').forEach((node) => {
      if (!node.dataset.kind) return
      const tower = { plot: Number(node.dataset.plot), kind: node.dataset.kind }
      const ok = this.linked(tower)
      node.classList.toggle('live', ok)
      node.classList.toggle('wilt', !ok)
      node.innerHTML = face(tower.kind) + '<span>' + KIND[tower.kind].title + (ok ? '' : ' вянет') + '</span>'
      node.dataset.cool = node.dataset.cool || '0'
    })
  }

  startWave() {
    if (this.over || this.running) return
    const ready = this.towers().some((tower) => this.linked(tower))
    if (!ready) {
      this.say('Сначала живая цепь: трава, рядом заяц, рядом лиса.')
      return
    }
    this.wave += 1
    this.running = true
    this.spawnLeft = this.wave === 3 ? 1 : 4 + this.wave
    this.spawnEvery = 0.4
    this.say(this.wave === 3 ? 'Босс — туча копоти. Держите цепь!' : 'Волна ' + this.wave + ' ползёт к дуплу.')
    beep(300, 0.1, 'sine', 0.04)
    this.sync()
  }

  finish(victory) {
    if (this.over) return
    this.over = victory ? 'win' : 'lose'
    this.running = false
    const end = this.root.querySelector('.forest-end')
    end.hidden = false
    end.dataset.worldResult = victory ? 'win' : 'lose'
    const stars = this.miss <= 1 ? 3 : this.miss <= 3 ? 2 : 1
    end.innerHTML = victory
      ? '<div><h2>Лес дышит</h2><p>Звёзды: ' + stars + '. Цепь устояла, дупло цело.</p><button type="button" data-world-exit>На глобус</button></div>'
      : '<div><h2>Дупло в копоти</h2><p>Цепь можно собрать заново. Лес подождёт.</p><button type="button" data-world-retry>Ещё раз</button></div>'
    gsap.from(end, { y: 20, duration: 0.3 })
    const exit = end.querySelector('[data-world-exit]')
    if (exit) exit.addEventListener('click', () => this.hub.finish({ win: true, stars }))
    const retry = end.querySelector('[data-world-retry]')
    if (retry) retry.addEventListener('click', () => this.scene.restart())
    this.sync()
  }

  say(text) { this.root.querySelector('.forest-speech').textContent = text }

  sync() {
    const den = this.root.querySelector('[data-den]')
    if (den) den.textContent = 'Дупло ' + Math.max(0, this.den)
    const money = this.root.querySelector('[data-money]')
    if (money) money.textContent = 'Семечки ' + this.money
    window.__guardian = {
      world: 'forest',
      wave: this.wave,
      running: this.running,
      den: this.den,
      over: this.over,
      money: this.money
    }
  }
}

export function mount(root, hub) {
  audioContext()
  const stopMusic = loop(520, (tick) => {
    beep([392, 440, 494, 440][tick % 4], 0.22, 'sine', 0.03)
    if (tick % 5 === 0) beep(880, 0.05, 'triangle', 0.02)
  })
  root.innerHTML =
    '<section class="world-forest">' +
    '<header class="forest-top"><div><h1>Лесная оборона</h1><p class="forest-speech">Собери цепь, иначе поляна завянет.</p></div>' +
    '<span data-money>Семечки 100</span><span class="den" data-den>Дупло 5</span>' +
    '<button type="button" class="forest-mute" data-mute>' + (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="plots">' + [0, 1, 2, 3, 4, 5].map((id) =>
      '<button type="button" data-plot="' + id + '">Поляна</button>'
    ).join('') + '</div>' +
    '<div class="forest-stage" data-view></div>' +
    '<footer class="forest-tray">' +
    '<button type="button" class="seed on" data-seed="grass">' + face('grass') + 'Трава</button>' +
    '<button type="button" class="seed" data-seed="hare">' + face('hare') + 'Заяц</button>' +
    '<button type="button" class="seed" data-seed="fox">' + face('fox') + 'Лиса</button>' +
    '<button type="button" class="wave" data-wave>Пустить волну</button></footer>' +
    '<div class="forest-splash"><div><h2>Тихий лес</h2><p>Ставь зверей так, чтобы они могли поесть. Иначе защита вянет.</p></div></div>' +
    '<div class="forest-end" hidden></div></section>'
  const host = root.querySelector('.world-forest')
  let seed = 'grass'
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })
  host.querySelectorAll('[data-seed]').forEach((btn) => btn.addEventListener('click', () => {
    seed = btn.dataset.seed
    host.querySelectorAll('[data-seed]').forEach((node) => node.classList.toggle('on', node === btn))
  }))
  host.querySelectorAll('[data-plot]').forEach((btn) => btn.addEventListener('click', () => {
    if (live) live.place(Number(btn.dataset.plot), seed)
  }))
  host.querySelector('[data-wave]').addEventListener('click', () => { if (live) live.startWave() })
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.querySelector('[data-view]'),
    width: 960,
    height: 540,
    backgroundColor: '#d9f99d',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: ForestScene,
    callbacks: {
      preBoot(instance) {
        instance.registry.set('hub', hub)
        instance.registry.set('root', host)
      }
    }
  })
  gsap.to(host.querySelector('.forest-splash'), {
    opacity: 0, delay: 0.7, duration: 0.3,
    onComplete: () => {
      host.querySelector('.forest-splash').hidden = true
      host.dataset.ready = '1'
    }
  })
  return {
    destroy() {
      stopMusic()
      live = null
      game.destroy(true)
    }
  }
}
