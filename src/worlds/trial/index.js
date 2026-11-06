/* Испытание Хранителя: короткая смешанная игра, не викторина.
   Лови знакомые карточки и уворачивайся от серых пятен. */
import * as THREE from 'three'
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, label, mesh, geo, mat } from '../../engine/kit.js'
import { orderByWeak } from '../../learn.js'
import { itemsOf } from '../../data/curriculum.js'
import { load } from '../../save.js'

const IDS = ['city', 'space', 'forest', 'body', 'russia', 'time', 'eco']

export function mount(root, hub) {
  audioContext()
  const stop = loop(240, (tick) => beep([440, 554, 659, 880][tick % 4], 0.08, 'triangle', 0.03))
  const game = mountGame(root, hub, spec())
  return { destroy() { stop(); game.destroy() } }
}

function spec() {
  const known = orderByWeak(IDS.flatMap((id) => itemsOf(id)), load(), (item) => item.id).slice(0, 8)
  const cards = (known.length ? known : itemsOf('city').slice(0, 4)).map((item) => ({
    id: item.id || item,
    title: item.title || 'Карточка'
  }))
  return {
    id: 'trial',
    winTitle: 'Испытание пройдено',
    loseTitle: 'Пятна победили',
    winText: 'Знания снова сработали в деле.',
    loseText: 'Можно пройти испытание ещё раз.',
    howto: [
      'Веди героя пальцем по площадке.',
      'Касайся ярких карточек.',
      'Серые пятна обходи.'
    ],
    stage: { sky: 0xfde68a, fog: 0xfef3c7, cam: [0, 6.5, 7], fov: 46 },
    create(api) {
      dress(api.world, 'eco')
      const hero = makeBuddy('guard', 0xfbbf24)
      hero.position.set(0, 0, 1.5)
      api.world.add(hero)
      const state = { hero, x: 0, z: 1.5, tx: 0, tz: 1.5, bits: [], spawn: 0.2, got: 0, need: Math.min(6, cards.length), hp: 4, cards }
      api.setGoal('Собери ' + state.need + ' карточек')
      api.setActions([{ id: 'center', label: 'В центр', color: '#fde68a' }])
      api.say('Яркое — твоё. Серое — в сторону.')
      return state
    },
    pointer(state, api) {
      state.tx = api.pointer.nx * 3
      state.tz = 1.2 - api.pointer.ny * 1.4
    },
    action(state, id) {
      if (id === 'center') { state.tx = 0; state.tz = 1.2 }
    },
    update(state, dt, api) {
      state.x += (state.tx - state.x) * Math.min(1, dt * 4)
      state.z += (state.tz - state.z) * Math.min(1, dt * 4)
      state.hero.position.set(state.x, 0, state.z)
      state.spawn -= dt
      if (state.spawn <= 0 && state.got < state.need) {
        state.spawn = 1.3
        const good = Math.random() > 0.35
        const card = state.cards[state.got % state.cards.length]
        const x = (Math.random() * 5) - 2.5
        const z = (Math.random() * 2) - 0.2
        const token = good
          ? label(card.title, '#b45309')
          : mesh(geo('blot', () => new THREE.SphereGeometry(0.28, 10, 8)), mat(0x64748b), x, 0.4, z)
        if (good) token.position.set(x, 0.5, z)
        api.world.add(token)
        state.bits.push({ mesh: token, x, z, good, id: card.id, life: 4.5 })
      }
      state.bits.forEach((bit) => {
        bit.life -= dt
        if (Math.hypot(bit.x - state.x, bit.z - state.z) < 0.55) {
          bit.dead = true
          if (bit.good) {
            state.got += 1
            api.award(bit.id)
            beep(700, 0.05, 'triangle', 0.03)
          } else {
            state.hp -= 1
            api.oops('Серое пятно. Обходи его.')
            if (state.hp <= 0) api.lose('Слишком много пятен.')
          }
        }
      })
      state.bits = state.bits.filter((bit) => {
        if (bit.dead || bit.life <= 0) api.world.remove(bit.mesh)
        return !bit.dead && bit.life > 0
      })
      api.setProgress(state.got / state.need)
      api.setGoal('Карточки: ' + state.got + ' / ' + state.need)
      if (state.got >= state.need) api.win()
    },
    decorate(state, api) { tickBuddy(state.hero, api.time, 'run') }
  }
}
