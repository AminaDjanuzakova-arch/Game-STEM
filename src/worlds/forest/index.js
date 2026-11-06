/* Лесная оборона. Ставь траву, зайца и лису на поляны.
   Грязь ползёт к дереву. Неверная цепь вянет. */
import * as THREE from 'three'
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, tree, mesh, geo, mat } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

export function mount(root, hub) {
  audioContext()
  const stop = loop(480, (tick) => beep([392, 440, 494, 440][tick % 4], 0.16, 'sine', 0.03))
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  const waves = level >= 3 ? 2 : 1
  return {
    id: 'forest',
    winTitle: 'Дерево цело',
    loseTitle: 'Дерево в копоти',
    winText: 'Цепь питания устояла.',
    loseText: 'Собери цепь заново: трава, заяц, лиса.',
    howto: [
      'Выбери существо внизу.',
      'Поставь его на поляну 1, 2 или 3.',
      'Нажми «Волна». Грязь не должна дойти до дерева.'
    ],
    stage: { sky: 0xd9f99d, fog: 0xbbf7d0, cam: [0, 7.2, 7.5], fov: 42 },
    create(api) {
      dress(api.world, 'forest')
      const home = tree(3.2, 0.2, 0x14532d)
      api.world.add(home)
      const pads = [0, 1, 2].map((index) => {
        const pad = mesh(geo('pad', () => new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16)), mat(0xecfccb), -1.8 + index * 1.5, 0.05, 0.8)
        pad.userData.plot = index
        api.world.add(pad)
        return { pad, kind: '' }
      })
      const state = { pads, seed: 'grass', blobs: [], wave: 0, waves, running: false, den: 4, mood: 'idle', hero: makeBuddy('hare', 0xf8fafc) }
      state.hero.position.set(-3.2, 0, 2)
      api.world.add(state.hero)
      paint(state, api)
      api.say('Сначала трава. Рядом с ней заяц сможет есть.')
      return state
    },
    decorate(state, api) { tickBuddy(state.hero, api.time, state.running ? 'scared' : 'idle') },
    action(state, id, api) {
      if (id === 'grass' || id === 'hare' || id === 'fox') {
        state.seed = id
        paint(state, api)
        return
      }
      if (id === 'p0' || id === 'p1' || id === 'p2') place(state, Number(id[1]), api)
      if (id === 'wave') start(state, api)
    },
    update(state, dt, api) {
      if (!state.running) return
      state.blobs.forEach((blob) => {
        blob.z -= dt * (api.level >= 3 && state.wave === state.waves ? 0.85 : 0.55)
        blob.mesh.position.z = blob.z
        const towers = state.pads.filter((pad) => linked(state, pad))
        if (towers.length && blob.mesh.position.x < 2.6) blob.hp -= dt * (8 + towers.length * 6)
        if (blob.hp <= 0) blob.dead = true
        if (blob.z < 0.4) {
          blob.dead = true
          state.den -= 1
          api.fault('chain-fox')
          api.say('Грязь дошла до дерева. Нужна живая цепь.')
          if (state.den <= 0) api.lose('Дерево не устояло.')
        }
      })
      state.blobs = state.blobs.filter((blob) => {
        if (blob.dead) api.world.remove(blob.mesh)
        return !blob.dead
      })
      api.setProgress(1 - state.den / 4)
      if (state.running && state.blobs.length === 0 && state.spawned) {
        state.running = false
        if (state.wave >= state.waves) api.win()
        else api.say('Волна стихла. Можно усилить цепь и пустить следующую.')
      }
    }
  }
}

function paint(state, api) {
  api.setGoal(api.level >= 3 ? 'Удержи босса-тучу' : 'Не пусти грязь к дереву')
  api.setProgress((4 - state.den) / 4)
  api.setActions([
    { id: 'grass', label: 'Трава', color: state.seed === 'grass' ? '#86efac' : '#dcfce7' },
    { id: 'hare', label: 'Заяц', color: state.seed === 'hare' ? '#e7e5e4' : '#f5f5f4' },
    { id: 'fox', label: 'Лиса', color: state.seed === 'fox' ? '#fdba74' : '#ffedd5' },
    { id: 'p0', label: 'Поляна 1', color: '#fff' },
    { id: 'p1', label: 'Поляна 2', color: '#fff' },
    { id: 'p2', label: 'Поляна 3', color: '#fff' },
    { id: 'wave', label: 'Волна', color: '#fde68a' }
  ])
}

function place(state, index, api) {
  const pad = state.pads[index]
  if (pad.guest) api.world.remove(pad.guest)
  pad.kind = state.seed
  const colors = { grass: 0x22c55e, hare: 0xf8fafc, fox: 0xf97316 }
  const guest = makeBuddy(state.seed === 'grass' ? 'hare' : state.seed === 'hare' ? 'hare' : 'fox', colors[state.seed])
  if (state.seed === 'grass') guest.scale.setScalar(0.35)
  else guest.scale.setScalar(0.45)
  guest.position.set(pad.pad.position.x, 0.2, pad.pad.position.z)
  pad.guest = guest
  api.world.add(guest)
  const ok = linked(state, pad)
  api.say(ok ? 'Цепь живая.' : 'Так цепь вянет: трава, рядом заяц, рядом лиса.')
  if (ok) {
    const lesson = itemsForLevel('forest', api.level)[index] || itemsForLevel('forest', api.level)[0]
    if (lesson) api.award(lesson.id)
    beep(520, 0.06, 'sine', 0.04)
  } else api.fault(state.seed === 'fox' ? 'chain-fox' : 'chain-hare')
}

function linked(state, pad) {
  if (!pad.kind) return false
  if (pad.kind === 'grass') return true
  const index = state.pads.indexOf(pad)
  const near = (kind) => state.pads.some((other, otherIndex) => other.kind === kind && Math.abs(otherIndex - index) === 1)
  if (pad.kind === 'hare') return near('grass')
  return state.pads.some((other, otherIndex) => other.kind === 'hare' && Math.abs(otherIndex - index) === 1 && linked(state, other))
}

function start(state, api) {
  if (state.running) return
  if (!state.pads.some((pad) => linked(state, pad))) {
    api.say('Сначала поставь хотя бы траву.')
    return
  }
  if (api.level >= 2 && !state.pads.some((pad) => pad.kind === 'fox' && linked(state, pad))) {
    api.say('Поставь лису рядом с зайцем.')
    return
  }
  state.wave += 1
  state.running = true
  state.spawned = true
  const count = api.level === 1 ? 3 : 4
  for (let i = 0; i < count; i += 1) {
    const blob = mesh(geo('blob', () => new THREE.SphereGeometry(0.28, 12, 10)), mat(state.wave === state.waves && api.level >= 3 ? 0x3f3f46 : 0x64748b), -2 + i * 0.2, 0.3, 4 + i * 0.8)
    api.world.add(blob)
    state.blobs.push({ mesh: blob, z: blob.position.z, hp: api.level >= 3 && state.wave === state.waves ? 16 : 8, dead: false })
  }
  api.say(api.level >= 3 && state.wave === state.waves ? 'Туча копоти. Держи цепь!' : 'Волна пошла к дереву.')
}
