/* Тело-подлодка: вид сбоку. Веди субмарину пальцем и стреляй витаминами.
   Спасённый орган — открытие. Босс — вирус, его бьют те же привычки. */
import Phaser from 'phaser'
import gsap from 'gsap'
import { audioContext, beep, isMuted, loop, toggleMute } from '../../audio.js'
import { cardById } from '../../rewards.js'
import './style.css'

const FACTS = ['heart', 'lungs', 'brain', 'stomach', 'bones', 'skin']
let live = null

class BodyScene extends Phaser.Scene {
  constructor() { super('body') }

  create() {
    live = this
    this.hub = this.game.registry.get('hub')
    this.root = this.game.registry.get('root')
    this.aimY = 270
    this.subY = 270
    this.oxy = this.hub.hero.bonus === 'hp' ? 120 : 100
    this.kills = 0
    this.saved = 0
    this.hp = 5
    this.miss = 0
    this.cool = 0
    this.boss = null
    this.germs = []
    this.shots = []
    this.bubbles = []
    this.spawn = 0.4
    this.over = ''
    this.cameras.main.setBackgroundColor('#0f766e')
    this.drawFlesh()
    this.sub = this.makeSub(150, 270)
    this.input.on('pointermove', (pointer) => { this.aimY = pointer.y })
    this.input.on('pointerdown', (pointer) => { this.aimY = pointer.y; this.firing = true })
    this.input.on('pointerup', () => { this.firing = false })
    this.root.querySelector('.body-end').hidden = true
    this.sync()
  }

  drawFlesh() {
    const g = this.add.graphics()
    g.fillStyle(0x115e59, 0.35)
    for (let i = 0; i < 5; i += 1) g.fillEllipse(200 + i * 140, 80 + (i % 2) * 360, 120, 70)
    const organs = [[300, 160, 'Сердце'], [520, 300, 'Лёгкие'], [760, 180, 'Мозг']]
    organs.forEach(([x, y, label]) => {
      const blob = this.add.graphics()
      blob.fillStyle(0xf9a8d4, 0.85)
      blob.fillEllipse(0, 0, 70, 54)
      blob.fillStyle(0x111827, 1)
      blob.fillCircle(-12, -6, 3)
      blob.fillCircle(8, -6, 3)
      const wrap = this.add.container(x, y, [blob])
      this.add.text(x - 28, y + 34, label, { fontFamily: 'Palatino, serif', fontSize: '16px', color: '#ecfeff' })
      this.tweens.add({ targets: wrap, scaleX: 1.04, scaleY: 0.96, duration: 700, yoyo: true, repeat: -1 })
    })
  }

  makeSub(x, y) {
    const g = this.add.graphics()
    g.fillStyle(0xfde68a, 1)
    g.fillRoundedRect(-28, -16, 56, 32, 12)
    g.fillStyle(0x99f6e4, 1)
    g.fillCircle(10, -2, 10)
    g.fillStyle(0x111827, 1)
    g.fillCircle(8, -4, 2)
    g.fillCircle(14, -4, 2)
    const group = this.add.container(x, y, [g])
    return group
  }

  update(_time, delta) {
    if (this.over || this.root.dataset.ready !== '1') return
    const dt = Math.min(0.05, delta / 1000)
    this.oxy -= 4 * dt
    this.subY += (this.aimY - this.subY) * Math.min(1, dt * 6)
    this.sub.y = this.subY
    this.cool -= dt
    if ((this.firing || this.input.activePointer.isDown) && this.cool <= 0) this.fire()
    this.spawn -= dt
    if (this.spawn <= 0 && !this.boss && this.kills < 10) {
      this.spawn = 0.85
      this.germs.push(this.makeGerm(900, 80 + Math.random() * 380, false))
    }
    if (!this.boss && this.kills >= 10) this.summon()
    if (Math.random() < dt * 0.9) this.bubbles.push(this.makeBubble(880, this.subY + (Math.random() * 70 - 35)))
    this.shots.forEach((shot) => {
      shot.x += 520 * dt
      shot.sprite.x = shot.x
    })
    this.germs.forEach((germ) => {
      germ.x -= (germ.boss ? 40 : 75) * dt
      if (germ.boss) germ.x = Math.max(700, germ.x)
      germ.sprite.x = germ.x
      if (germ.x < -30) germ.alive = false
      if (!germ.boss && germ.alive && germ.x < 190 && Math.abs(germ.y - this.subY) < 36) this.hurt('Микроб добрался до лодки.')
      this.shots.forEach((shot) => {
        if (!shot.alive || !germ.alive) return
        if (Math.abs(shot.x - germ.x) < 24 && Math.abs(shot.y - germ.y) < 28) {
          shot.alive = false
          germ.hp -= 1
          if (germ.hp <= 0) this.popGerm(germ)
        }
      })
    })
    this.bubbles.forEach((bubble) => {
      bubble.x -= 90 * dt
      bubble.sprite.x = bubble.x
      if (Math.abs(bubble.x - 150) < 30 && Math.abs(bubble.y - this.subY) < 30) {
        bubble.alive = false
        this.oxy = Math.min(120, this.oxy + 28)
        beep(720, 0.05, 'sine', 0.03)
      }
    })
    this.cleanup()
    if (this.oxy <= 0) this.finish(false, 'Воздух кончился. Всплывай к пузырькам.')
    if (this.boss && this.boss.hp <= 0) this.finish(true)
    this.sync()
  }

  fire() {
    this.cool = 0.16
    const sprite = this.add.circle(180, this.subY, 6, 0xfef08a)
    this.shots.push({ x: 180, y: this.subY, sprite, alive: true })
    beep(480 + this.subY / 4, 0.04, 'square', 0.02)
  }

  makeGerm(x, y, boss) {
    const g = this.add.graphics()
    g.fillStyle(boss ? 0x6d28d9 : 0x22c55e, 1)
    g.fillCircle(0, 0, boss ? 34 : 16)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(-8, -4, boss ? 4 : 2)
    g.fillCircle(8, -4, boss ? 4 : 2)
    const sprite = this.add.container(x, y, [g])
    return { x, y, hp: boss ? 28 : 2, boss, sprite, alive: true }
  }

  makeBubble(x, y) {
    const sprite = this.add.circle(x, y, 10, 0xecfeff, 0.8)
    return { x, y, sprite, alive: true }
  }

  popGerm(germ) {
    germ.alive = false
    germ.sprite.destroy()
    if (germ.boss) return
    this.kills += 1
    if (this.kills % 2 === 0 && this.saved < FACTS.length) {
      const id = FACTS[this.saved]
      this.saved += 1
      this.hub.discover(id)
      const card = cardById(id)
      this.say(card.title + '. ' + card.text)
      beep(660, 0.08, 'triangle', 0.04)
    }
  }

  summon() {
    this.boss = this.makeGerm(820, 270, true)
    this.germs.push(this.boss)
    this.say('Вирус-босс. Держи лодку на его высоте и не отпускай выстрел.')
    this.hub.discover('body-boss')
  }

  hurt(text) {
    if (this.hurtLock) return
    this.hurtLock = true
    this.hp -= 1
    this.miss += 1
    this.cameras.main.shake(100, 0.01)
    this.say(text)
    this.time.delayedCall(400, () => { this.hurtLock = false })
    if (this.hp <= 0) this.finish(false, 'Лодка помята. Привычки всё ещё при тебе.')
  }

  cleanup() {
    this.shots = this.shots.filter((shot) => {
      if (!shot.alive || shot.x > 980) {
        shot.sprite.destroy()
        return false
      }
      return true
    })
    this.germs = this.germs.filter((germ) => germ.alive)
    this.bubbles = this.bubbles.filter((bubble) => {
      if (!bubble.alive || bubble.x < 0) {
        bubble.sprite.destroy()
        return false
      }
      return true
    })
  }

  finish(victory, reason) {
    if (this.over) return
    this.over = victory ? 'win' : 'lose'
    const stars = this.miss <= 1 ? 3 : this.miss <= 4 ? 2 : 1
    const end = this.root.querySelector('.body-end')
    end.hidden = false
    end.dataset.worldResult = victory ? 'win' : 'lose'
    end.innerHTML = victory
      ? '<div><h2>Органы улыбаются</h2><p>Звёзды: ' + stars + '. Сундук с привычками открыт.</p><button type="button" data-world-exit>На глобус</button></div>'
      : '<div><h2>Всплытие</h2><p>' + (reason || 'Ещё один заход.') + '</p><button type="button" data-world-retry>Ещё раз</button></div>'
    const exit = end.querySelector('[data-world-exit]')
    if (exit) exit.addEventListener('click', () => this.hub.finish({ win: true, stars }))
    const retry = end.querySelector('[data-world-retry]')
    if (retry) retry.addEventListener('click', () => this.scene.restart())
  }

  say(text) {
    const node = this.root.querySelector('.body-speech')
    if (node) node.textContent = text
  }

  sync() {
    const bar = this.root.querySelector('.oxy b')
    if (bar) bar.style.width = Math.max(0, this.oxy) + '%'
    const pips = this.root.querySelector('.organ-pips')
    if (pips) {
      pips.innerHTML = FACTS.map((_, index) => '<i class="' + (index < this.saved ? 'on' : '') + '"></i>').join('')
    }
    window.__guardian = {
      world: 'body',
      over: this.over,
      kills: this.kills,
      hp: this.hp,
      oxy: this.oxy,
      subY: this.subY,
      boss: this.boss && this.boss.alive ? { x: this.boss.x, y: this.boss.y, hp: this.boss.hp } : null,
      germs: this.germs.filter((germ) => germ.alive && !germ.boss).map((germ) => ({ x: germ.x, y: germ.y }))
    }
  }
}

export function mount(root, hub) {
  audioContext()
  let beat = 0
  const stopMusic = loop(640, () => {
    beat += 1
    beep(70, 0.12, 'sine', 0.05)
    if (beat % 2 === 0) beep(196, 0.2, 'triangle', 0.02)
  })
  root.innerHTML =
    '<section class="world-body">' +
    '<header class="body-top"><div><h1>Тело-подлодка</h1><p class="body-speech">Доктор Капля ищет органы.</p></div>' +
    '<div class="organ-pips"></div><button type="button" class="body-mute" data-mute>' +
    (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="body-stage" data-view></div>' +
    '<footer class="body-bottom"><span>Воздух</span><div class="oxy"><b></b></div></footer>' +
    '<div class="body-splash"><div><h2>Погружение</h2><p>Веди лодку и удерживай палец, чтобы стрелять витаминами.</p></div></div>' +
    '<div class="body-end" hidden></div></section>'
  const host = root.querySelector('.world-body')
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host.querySelector('[data-view]'),
    width: 960,
    height: 540,
    backgroundColor: '#0f766e',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: BodyScene,
    callbacks: {
      preBoot(instance) {
        instance.registry.set('hub', hub)
        instance.registry.set('root', host)
      }
    }
  })
  gsap.to(host.querySelector('.body-splash'), {
    opacity: 0, delay: 0.7, duration: 0.3,
    onComplete: () => {
      host.querySelector('.body-splash').hidden = true
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
