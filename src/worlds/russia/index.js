/* Большой забег. Прыжок и скольжение.
   1 — короткий север. 2 — больше зон. 3 — ворота со зверями. */
import * as THREE from 'three'
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, tree, mesh, geo, mat } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

const GATES = [
  { fact: 'zone-arctic', label: 'Арктика', answer: 'bear', options: [['bear', 'Белый медведь'], ['deer', 'Олень'], ['moose', 'Лось']] },
  { fact: 'zone-tundra', label: 'Тундра', answer: 'deer', options: [['bear', 'Белый медведь'], ['deer', 'Северный олень'], ['moose', 'Лось']] },
  { fact: 'zone-taiga', label: 'Тайга', answer: 'moose', options: [['moose', 'Лось'], ['deer', 'Олень'], ['bear', 'Медведь']] },
  { fact: 'rus-boss', label: 'С севера на юг', answer: 'order', options: [['order', 'Север → юг'], ['back', 'Юг → север'], ['mix', 'Как попало']] }
]

export function mount(root, hub) {
  audioContext()
  const stop = loop(210, (tick) => beep([392, 440, 523, 392][tick % 4], 0.1, 'square', 0.03))
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  return {
    id: 'russia',
    winTitle: 'Финиш',
    loseTitle: 'Привал',
    winText: 'Зоны легли с севера на юг.',
    loseText: 'Лапы заплелись. Тропа на месте.',
    howto: [
      'Зверёк бежит сам.',
      'Низкий забор — кнопка «Прыжок».',
      'Ветка сверху — «Скольжение».'
    ],
    stage: { sky: 0xbae6fd, fog: 0xdbeafe, cam: [0, 2.4, 7] },
    create(api) {
      dress(api.world, 'russia')
      const hero = makeBuddy('hare', 0xf8fafc)
      hero.position.set(-2, 0, 1)
      api.world.add(hero)
      const lessons = itemsForLevel('russia', api.level)
      const events = []
      const count = level === 1 ? 4 : 6
      for (let i = 0; i < count; i += 1) {
        const kind = i === 0 ? 'coin' : ['jump', 'slide', 'coin'][i % 3]
        events.push({ at: 4 + i * 3.2, kind, fact: lessons[i % lessons.length]?.id || '', done: false })
      }
      api.setActions([
        { id: 'jump', label: 'Прыжок', color: '#bfdbfe' },
        { id: 'slide', label: 'Скольжение', color: '#fdba74' }
      ], api.level === 1 ? 'jump' : '')
      return { hero, y: 0, vy: 0, dist: 0, events, speed: level === 1 ? 2.1 : 2.7, hp: 4, slide: 0, air: 0, goal: events[events.length - 1].at + 2, gate: 0, gating: false, mood: 'run' }
    },
    action(state, id, api) {
      if (state.gating) {
        const gate = GATES[state.gate]
        if (id === gate.answer) {
          api.award(gate.fact)
          state.gate += 1
          api.say('Верно. Бежим дальше.')
          if (state.gate >= GATES.length) api.win()
          else ask(state, api)
        } else {
          api.fault(gate.fact)
          state.hp -= 1
          if (state.hp <= 0) api.lose('Ворота закрылись.')
          else api.say('Это зверь другой зоны.')
        }
        return
      }
      if (id === 'jump' && state.y <= 0.01) { state.vy = 4.2; state.air = 0.7; state.mood = 'jump' }
      if (id === 'slide' && state.slide <= 0) { state.slide = 0.7; state.mood = 'scared' }
    },
    update(state, dt, api) {
      if (state.gating) return
      state.dist += state.speed * dt
      state.vy -= 9 * dt
      state.y = Math.max(0, state.y + state.vy * dt)
      state.slide = Math.max(0, state.slide - dt)
      state.air = Math.max(0, state.air - dt)
      state.hero.position.y = state.y
      if (state.y === 0 && state.slide <= 0) state.mood = 'run'
      state.events.forEach((event) => {
        if (event.done) return
        const rel = event.at - state.dist
        if (rel > 0.3 || rel < -0.2) return
        event.done = true
        if (event.kind === 'coin') {
          if (event.fact) api.award(event.fact)
          beep(640, 0.05, 'triangle', 0.03)
        } else if (event.kind === 'jump' && state.air <= 0) hurt(state, api, 'Низкий забор. В следующий раз прыгни.')
        else if (event.kind === 'slide' && state.slide <= 0) hurt(state, api, 'Ветка сверху. Под ней скользят.')
        else beep(700, 0.04, 'square', 0.03)
      })
      api.setGoal(api.level >= 3 ? 'Добеги до ворот' : 'Доберись до флажка')
      api.setProgress(Math.min(1, state.dist / state.goal))
      if (state.dist >= state.goal) {
        if (api.level >= 3) { state.gating = true; ask(state, api) }
        else api.win()
      }
    },
    decorate(state, api) { tickBuddy(state.hero, api.time, state.mood) }
  }
}

function hurt(state, api, text) {
  state.hp -= 1
  api.oops(text)
  if (state.hp <= 0) api.lose('Силы кончились.')
}

function ask(state, api) {
  const gate = GATES[state.gate]
  api.mark(gate.answer)
  api.setGoal(gate.label + ': кто здесь живёт?')
  api.setActions(gate.options.map(([id, label]) => ({ id, label, color: '#fff' })))
  api.say(gate.label)
}
