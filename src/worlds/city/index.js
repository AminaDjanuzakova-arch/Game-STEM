/* Безопасный город: приключение от третьего лица.
   Ситуации перемешаны. Кнопка — это поступок, город отвечает анимацией.
   Новый случай: добавь объект в ENCOUNTERS и рисунок в look(). */
import Phaser from 'phaser'
import gsap from 'gsap'
import { beep, isMuted, loop, toggleMute, audioContext } from '../../audio.js'
import { cardById } from '../../rewards.js'
import './style.css'

const ENCOUNTERS = [
  {
    id: 'cross',
    look: 0x38bdf8,
    beat: 'Машины закрывают обзор. Зебра дальше по улице.',
    correct: 'zebra',
    fact: 'road-zebra',
    hint: 'Не выходи из-за машин: водитель тебя не видит.',
    actions: [
      { id: 'cars', label: 'Шагнуть между машинами' },
      { id: 'zebra', label: 'Дойти до зебры' },
      { id: 'run', label: 'Перебежать здесь' }
    ]
  },
  {
    id: 'light',
    look: 0x0284c7,
    beat: 'На зебре красный. Телефон звонит в кармане.',
    correct: 'wait',
    fact: 'road-light',
    hint: 'На красный стоят. Телефон на переходе убирают и смотрят по сторонам.',
    actions: [
      { id: 'go', label: 'Идти на красный' },
      { id: 'phone', label: 'Смотреть в телефон' },
      { id: 'wait', label: 'Ждать зелёный' }
    ]
  },
  {
    id: 'home',
    look: 0xfb923c,
    beat: 'Дома на полу нож, рядом розетка.',
    correct: 'adult',
    fact: 'home-safe',
    hint: 'Нож и розетка — дело взрослых. Если беда, зови их и набирай 112.',
    actions: [
      { id: 'knife', label: 'Взять нож' },
      { id: 'plug', label: 'Потрогать розетку' },
      { id: 'adult', label: 'Позвать взрослого' }
    ]
  },
  {
    id: 'net',
    look: 0x7c3aed,
    beat: 'Чужой номер пишет: «Это мама, открой ссылку и пришли адрес».',
    correct: 'show',
    fact: 'net-safe',
    hint: 'Маме звонят по знакомому номеру. Чужую ссылку не открывают.',
    actions: [
      { id: 'open', label: 'Открыть ссылку' },
      { id: 'send', label: 'Отправить адрес' },
      { id: 'show', label: 'Показать взрослым' }
    ]
  }
]

const BOSS_HITS = [
  {
    beat: 'Король катит машину прямо на людей!',
    correct: 'stop',
    hint: 'Героя узнают по тому, что он останавливает, а не бежит под колёса.',
    actions: [
      { id: 'stop', label: 'Поднять руку: стой' },
      { id: 'dash', label: 'Проскочить' },
      { id: 'photo', label: 'Снять на телефон' }
    ]
  },
  {
    beat: 'Он подсовывает незнакомца с конфетой.',
    correct: 'away',
    hint: 'С незнакомцем не уходят, даже если предлагают подарок.',
    actions: [
      { id: 'away', label: 'Отойти к своим' },
      { id: 'go', label: 'Пойти за ним' },
      { id: 'take', label: 'Взять конфету' }
    ]
  },
  {
    beat: 'Из люка лезет провод и искры.',
    correct: 'back',
    hint: 'Искры и оголённые провода не трогают. Отходят и зовут взрослых.',
    actions: [
      { id: 'back', label: 'Отойти и позвать' },
      { id: 'touch', label: 'Поправить провод' },
      { id: 'water', label: 'Плеснуть воды' }
    ]
  },
  {
    beat: 'Король орёт: скорее открой ссылку, а то проиграешь!',
    correct: 'close',
    hint: 'Спешка и приз в письме — частая ловушка. Ссылку закрывают.',
    actions: [
      { id: 'close', label: 'Закрыть и сказать взрослым' },
      { id: 'open', label: 'Открыть скорее' },
      { id: 'pass', label: 'Написать пароль' }
    ]
  }
]

function shuffle(list) {
  const copy = list.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

let live = null

class CityScene extends Phaser.Scene {
  constructor() { super('city') }

  create() {
    live = this
    this.hub = this.game.registry.get('hub')
    this.root = this.game.registry.get('root')
    this.hearts = this.hub.hero.bonus === 'shield' ? 4 : 3
    this.maxHearts = this.hearts
    this.miss = 0
    this.step = 0
    this.lock = true
    this.phase = 'walk'
    this.queue = shuffle(ENCOUNTERS)
    this.bossQueue = shuffle(BOSS_HITS)
    this.index = 0
    this.bossHp = this.bossQueue.length
    this.found = []
    this.correct = ''
    this.root.querySelector('.city-end').hidden = true
    this.root.querySelector('.city-fact').hidden = true
    const dot = this.make.graphics({ add: false })
    dot.fillStyle(0xffffff)
    dot.fillCircle(4, 4, 4)
    dot.generateTexture('city-dot', 8, 8)
    this.drawStreet()
    this.guard = this.makeGuard(180, 360)
    this.dog = this.makeDog(120, 400)
    this.car = this.makeCar(760, 390)
    this.king = this.makeKing(760, 300)
    this.king.setVisible(false)
    this.sync()
    this.time.delayedCall(900, () => this.nextBeat())
  }

  drawStreet() {
    this.cameras.main.setBackgroundColor('#7dd3fc')
    const sky = this.add.graphics()
    sky.fillStyle(0xfde68a, 1)
    sky.fillCircle(820, 70, 36)
    sky.fillStyle(0x1e293b, 1)
    for (let i = 0; i < 8; i += 1) {
      const h = 90 + (i % 3) * 30
      sky.fillRect(40 + i * 110, 210 - h, 80, h)
      sky.fillStyle(0xfef3c7, 1)
      sky.fillRect(55 + i * 110, 230 - h, 16, 18)
      sky.fillStyle(0x1e293b, 1)
    }
    sky.fillStyle(0x475569, 1)
    sky.fillRect(0, 400, 960, 140)
    sky.fillStyle(0xf8fafc, 1)
    for (let i = 0; i < 8; i += 1) sky.fillRect(360 + i * 18, 430, 8, 28)
    this.street = sky
  }

  makeGuard(x, y) {
    const group = this.add.container(x, y)
    const body = this.add.graphics()
    body.fillStyle(0x1d4ed8, 1)
    body.fillRoundedRect(-22, -20, 44, 52, 10)
    body.fillStyle(0xfacc15, 1)
    body.fillRoundedRect(-18, -8, 36, 32, 8)
    body.fillStyle(0xffd1b3, 1)
    body.fillCircle(0, -42, 18)
    body.fillStyle(0xf43f5e, 0.8)
    body.fillCircle(-12, -36, 4)
    body.fillCircle(12, -36, 4)
    const eyeL = this.add.ellipse(-6, -44, 5, 5, 0x111827)
    const eyeR = this.add.ellipse(6, -44, 5, 5, 0x111827)
    this.tweens.add({ targets: [eyeL, eyeR], scaleY: 0.15, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1600 })
    group.add([body, eyeL, eyeR])
    this.tweens.add({ targets: group, y: y + 6, duration: 280, yoyo: true, repeat: -1 })
    return group
  }

  makeDog(x, y) {
    const group = this.add.container(x, y)
    const g = this.add.graphics()
    g.fillStyle(0xd97706, 1)
    g.fillEllipse(0, 0, 46, 28)
    g.fillCircle(18, -12, 12)
    g.fillStyle(0x111827, 1)
    g.fillCircle(22, -14, 2)
    const tail = this.add.rectangle(-24, -6, 16, 6, 0xb45309)
    group.add([g, tail])
    this.tweens.add({ targets: tail, angle: 28, duration: 180, yoyo: true, repeat: -1 })
    return group
  }

  makeCar(x, y) {
    const group = this.add.container(x, y)
    const g = this.add.graphics()
    g.fillStyle(0xef4444, 1)
    g.fillRoundedRect(-50, -18, 100, 32, 8)
    g.fillStyle(0xbae6fd, 1)
    g.fillRoundedRect(-20, -32, 40, 18, 6)
    g.fillStyle(0x111827, 1)
    g.fillCircle(-28, 16, 8)
    g.fillCircle(28, 16, 8)
    group.add(g)
    return group
  }

  makeKing(x, y) {
    const group = this.add.container(x, y)
    const g = this.add.graphics()
    g.fillStyle(0x3f3f46, 1)
    g.fillRoundedRect(-40, -20, 80, 70, 12)
    g.fillStyle(0xfbbf24, 1)
    g.fillTriangle(-28, -20, 0, -58, 28, -20)
    g.fillStyle(0xfecaca, 1)
    g.fillCircle(0, -6, 16)
    g.fillStyle(0x111827, 1)
    g.fillCircle(-5, -8, 2)
    g.fillCircle(5, -8, 2)
    group.add(g)
    return group
  }

  nextBeat() {
    this.lock = false
    if (this.index < this.queue.length) {
      this.phase = 'beat'
      this.king.setVisible(false)
      const beat = this.queue[this.index]
      this.current = beat
      this.correct = beat.correct
      this.cameras.main.setBackgroundColor(beat.look)
      this.say(beat.beat)
      this.renderActs(beat.actions)
      this.placeActors(beat.id)
    } else if (this.bossHp > 0 && this.bossQueue.length) {
      this.phase = 'boss'
      this.king.setVisible(true)
      this.tweens.add({ targets: this.king, y: 250, duration: 400, yoyo: true })
      const beat = this.bossQueue[0]
      this.current = beat
      this.correct = beat.correct
      this.say(beat.beat)
      this.renderActs(beat.actions)
    } else {
      this.victory()
    }
    this.sync()
  }

  placeActors(id) {
    this.guard.x = id === 'home' || id === 'net' ? 280 : 200
    this.car.setVisible(id === 'cross' || id === 'light')
    this.car.x = 820
  }

  renderActs(actions) {
    const box = this.root.querySelector('.city-acts')
    box.innerHTML = shuffle(actions).map((act) =>
      '<button type="button" data-act="' + act.id + '">' + act.label + '</button>'
    ).join('')
  }

  choose(id) {
    if (this.lock || !this.current) return
    this.lock = true
    this.step += 1
    const ok = id === this.correct
    if (!ok) {
      this.miss += 1
      this.hearts -= 1
      this.cameras.main.shake(180, 0.012)
      this.burst(this.guard.x, this.guard.y, 0xfb7185)
      if (this.car.visible) this.tweens.add({ targets: this.car, x: 160, duration: 280 })
      this.say(this.current.hint)
      beep(140, 0.2, 'sawtooth', 0.05)
      this.sync()
      if (this.hearts <= 0) {
        this.time.delayedCall(700, () => this.defeat())
        return
      }
      this.time.delayedCall(700, () => {
        this.lock = false
        if (this.car.visible) this.car.x = 820
        this.sync()
      })
      return
    }
    beep(520, 0.12, 'triangle', 0.06)
    beep(780, 0.14, 'triangle', 0.05, 0.08)
    this.burst(this.guard.x, this.guard.y - 40, 0xfde68a)
    this.tweens.add({ targets: this.guard, y: this.guard.y - 24, duration: 160, yoyo: true })
    this.dog.x = this.guard.x - 70
    if (this.current.fact) this.showFact(this.current.fact)
    this.say(this.phase === 'boss' ? 'Король отступает на шаг.' : 'Город выдохнул.')
    if (this.phase === 'boss') {
      this.bossHp -= 1
      this.bossQueue.shift()
      this.tweens.add({ targets: this.king, x: this.king.x + 30, duration: 200, yoyo: true })
    } else {
      this.index += 1
    }
    this.sync()
    this.time.delayedCall(650, () => this.nextBeat())
  }

  burst(x, y, color) {
    const emitter = this.add.particles(x, y, 'city-dot', {
      speed: 140,
      lifespan: 420,
      quantity: 10,
      scale: { start: 1, end: 0 },
      tint: color,
      emitting: false
    })
    emitter.explode(12)
    this.time.delayedCall(500, () => emitter.destroy())
  }

  showFact(id) {
    const card = cardById(id)
    if (!card) return
    this.hub.discover(id)
    if (!this.found.includes(card.title)) this.found.push(card.title)
    const node = this.root.querySelector('.city-fact')
    node.hidden = false
    node.innerHTML = '<b>' + card.title + '</b><br>' + card.text
    gsap.fromTo(node, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 })
  }

  say(text) {
    this.root.querySelector('.city-speech').textContent = text
  }

  stars() {
    if (this.miss <= 1) return 3
    if (this.miss <= 3) return 2
    return 1
  }

  victory() {
    this.phase = 'win'
    this.showFact('city-boss')
    this.say('Король опасностей сбежал.')
    const end = this.root.querySelector('.city-end')
    end.hidden = false
    end.dataset.worldResult = 'win'
    end.innerHTML = '<div><h2>Город спокоен</h2><p>Звёзды: ' + this.stars() +
      '. Сундук открылся.</p><p>' + (this.found.join(' · ') || 'Ты держал правила в деле.') +
      '</p><button type="button" data-world-exit>На глобус</button></div>'
    gsap.from(end, { scale: 0.9, duration: 0.35 })
    end.querySelector('[data-world-exit]').addEventListener('click', () => {
      this.hub.finish({ win: true, stars: this.stars() })
    })
    this.sync()
  }

  defeat() {
    this.phase = 'lose'
    const end = this.root.querySelector('.city-end')
    end.hidden = false
    end.dataset.worldResult = 'lose'
    end.innerHTML = '<div><h2>Смена не сдаётся</h2><p>Сердца кончились. Правила на месте — попробуй ещё раз.</p>' +
      '<button type="button" data-world-retry>Ещё раз</button></div>'
    end.querySelector('[data-world-retry]').addEventListener('click', () => this.scene.restart())
    this.sync()
  }

  sync() {
    const hearts = this.root.querySelector('.city-hearts')
    hearts.innerHTML = ''
    for (let i = 0; i < this.maxHearts; i += 1) {
      const bit = document.createElement('i')
      if (i >= this.hearts) bit.className = 'off'
      hearts.appendChild(bit)
    }
    this.root.dataset.correct = this.lock ? '' : (this.correct || '')
    this.root.dataset.step = String(this.step)
    this.root.dataset.phase = this.phase
    window.__guardian = {
      world: 'city',
      phase: this.phase,
      correct: this.lock ? '' : this.correct,
      hearts: this.hearts,
      step: this.step
    }
  }
}

export function mount(root, hub) {
  audioContext()
  const stopMusic = loop(280, (tick) => {
    const note = [262, 330, 392, 494][tick % 4]
    beep(note, 0.18, 'square', 0.035)
  })
  root.innerHTML =
    '<section class="world-city">' +
    '<header class="city-top"><h1>Безопасный город</h1><span>Страж и пёс Искра</span>' +
    '<div class="city-hearts"></div><button type="button" class="city-mute" data-mute>' +
    (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="city-view" data-view></div>' +
    '<footer class="city-radio"><p class="city-speech" id="city-speech">Патруль выходит.</p><div class="city-acts"></div></footer>' +
    '<div class="city-fact" hidden></div>' +
    '<div class="city-splash"><div><h2>Безопасный город</h2><p>Ты городской страж. Решай на ходу — улица отвечает.</p></div></div>' +
    '<div class="city-end" hidden></div></section>'
  const host = root.querySelector('.world-city')
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })
  host.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-act]')
    if (btn && live) live.choose(btn.dataset.act)
  })
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: root.querySelector('[data-view]'),
    width: 960,
    height: 540,
    backgroundColor: '#7dd3fc',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: CityScene,
    callbacks: {
      preBoot(instance) {
        instance.registry.set('hub', hub)
        instance.registry.set('root', host)
      }
    }
  })
  gsap.from(host.querySelector('.city-splash'), { opacity: 0, duration: 0.3 })
  gsap.to(host.querySelector('.city-splash'), {
    opacity: 0, delay: 0.85, duration: 0.35,
    onComplete: () => {
      host.querySelector('.city-splash').hidden = true
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
