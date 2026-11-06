/* Машина времени. Сачок ловит события своей эпохи.
   1 — Древняя Русь, фальшивки по краям. 2 — позже и быстрее. 3 — годы по порядку. */
import * as THREE from 'three'
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, mesh, geo, mat, label } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

export function mount(root, hub) {
  audioContext()
  const stop = loop(360, (tick) => beep([196, 247, 294, 247][tick % 4], 0.12, 'triangle', 0.03))
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  return {
    id: 'time',
    winTitle: 'Портал закрыт',
    loseTitle: 'Портал мигнул',
    winText: 'События встали по своим годам.',
    loseText: 'Шестерёнки целы. Заведи машину снова.',
    howto: [
      'Веди сачок пальцем влево и вправо.',
      'Лови светлые карточки своей эпохи.',
      'Тёмные карточки по краям не лови.'
    ],
    stage: { sky: 0x1e3a8a, fog: 0x312e81, cam: [0, 2.6, 7.4], rim: 0xfbbf24 },
    create(api) {
      dress(api.world, 'time')
      const hero = makeBuddy('guard', 0xfbbf24)
      hero.position.set(-2.4, 0, 1.4)
      api.world.add(hero)
      const net = mesh(geo('net', () => new THREE.BoxGeometry(1.3, 0.12, 0.4)), mat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 0.25 }), 0, 0.3, 2)
      api.world.add(net)
      const lessons = itemsForLevel('time', api.level)
      const goods = (lessons.length ? lessons : [{ id: 'y988', title: '988 год' }]).slice(0, level >= 3 ? 4 : 3)
      const queue = []
      goods.forEach((item, index) => {
        queue.push({ id: item.id, title: item.title, good: true, order: index })
        queue.push({ id: 'fake', title: 'Чужая эпоха', good: false, order: index })
      })
      return { hero, net, x: 0, queue, falling: null, caught: 0, need: goods.length, hp: 4, wait: 0.4, step: 0, mood: 'wave' }
    },
    pointer(state, api) { state.x = api.pointer.nx * 2.6 },
    update(state, dt, api) {
      state.net.position.x += (state.x - state.net.position.x) * Math.min(1, dt * 6)
      state.wait -= dt
      if (!state.falling && state.wait <= 0) drop(state, api)
      if (state.falling) {
        state.falling.y -= dt * (api.level >= 3 ? 1.5 : 1.15)
        state.falling.mesh.position.y = state.falling.y
        if (state.falling.y < 0.45 && Math.abs(state.falling.mesh.position.x - state.net.position.x) < 0.7) catchItem(state, api)
        else if (state.falling.y < -0.2) {
          api.world.remove(state.falling.mesh)
          state.falling = null
          state.wait = 0.35
        }
      }
      api.setGoal(api.level >= 3 ? 'Лови годы по порядку: ' + state.caught + '/' + state.need : 'Поймай свои события: ' + state.caught + '/' + state.need)
      api.setProgress(state.caught / state.need)
    },
    decorate(state, api) { tickBuddy(state.hero, api.time, state.mood) }
  }
}

function drop(state, api) {
  const card = state.queue.shift()
  if (!card) {
    if (state.caught < state.need) state.queue.push({ id: 'y988', title: '988 год', good: true, order: state.step })
    return
  }
  const inOrder = api.level < 3 || card.order === state.step
  if (card.good && !inOrder) card.good = false
  const x = card.good ? (api.level === 1 ? 0 : (Math.random() * 1.1 - 0.55)) : (Math.random() < 0.5 ? -2.5 : 2.5)
  const meshItem = label(card.title, card.good ? '#92400e' : '#450a0a')
  meshItem.position.set(x, 3.2, 1.2)
  api.world.add(meshItem)
  state.falling = { mesh: meshItem, y: 3.2, card }
  if (card.good && state.caught === 0) api.say(card.title + ' — лови сачком.')
}

function catchItem(state, api) {
  const card = state.falling.card
  api.world.remove(state.falling.mesh)
  state.falling = null
  state.wait = 0.4
  const inOrder = api.level < 3 || card.order === state.step
  if (card.good && inOrder) {
    state.caught += 1
    state.step += 1
    api.award(card.id)
    api.say(card.title)
    beep(523, 0.07, 'triangle', 0.04)
    state.mood = 'happy'
    if (state.caught >= state.need) api.win()
  } else {
    state.hp -= 1
    api.fault(api.level >= 3 ? 'timeline' : 'century')
    api.say('Это не твоя карточка. Сачок в центр.')
    state.mood = 'scared'
    if (state.hp <= 0) api.lose('Портал закрылся слишком рано.')
  }
}
