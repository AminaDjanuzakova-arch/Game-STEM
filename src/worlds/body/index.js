/* Тело-подлодка. Веди лодку пальцем. На 1 уровне витамины летят сами.
   2 — целься сам. 3 — вирус-босс. */
import * as THREE from 'three'
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, mesh, geo, mat } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

export function mount(root, hub) {
  audioContext()
  const stop = loop(640, () => { beep(78, 0.12, 'sine', 0.04); beep(196, 0.08, 'triangle', 0.02) })
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  const need = level >= 3 ? 6 : level === 2 ? 5 : 4
  return {
    id: 'body',
    winTitle: 'Органы улыбаются',
    loseTitle: 'Всплытие',
    winText: 'Привычки помогли телу.',
    loseText: 'Воздух или щит кончился. Зайди ещё раз.',
    howto: [
      'Веди подлодку пальцем вверх и вниз.',
      level === 1 ? 'Витамины летят сами.' : 'Держи палец, чтобы стрелять.',
      'Не дай микробу коснуться лодки. Собирай пузырьки.'
    ],
    stage: { sky: 0x0f766e, fog: 0x115e59, cam: [0, 1.4, 8], rim: 0xf9a8d4 },
    create(api) {
      dress(api.world, 'body')
      const hero = makeBuddy('doctor', 0xfde68a)
      hero.scale.setScalar(0.7)
      const sub = new THREE.Group()
      sub.add(mesh(geo('sub', () => new THREE.CapsuleGeometry(0.28, 0.5, 6, 10)), mat(0xfde68a, { metalness: 0.2 }), 0, 0, 0))
      sub.add(hero)
      hero.position.y = 0.15
      sub.position.set(-2.2, 0.2, 0)
      api.world.add(sub)
      ;[['Сердце', -0.2, 1.6], ['Лёгкие', 1.4, -0.8]].forEach(([title, x, y]) => {
        const organ = mesh(geo('organ', () => new THREE.SphereGeometry(0.45, 16, 12)), mat(0xf9a8d4, { roughness: 0.4 }), x, y + 0.8, -1.5)
        api.world.add(organ)
      })
      const lessons = itemsForLevel('body', api.level)
      if (api.level >= 3) api.setActions([{ id: 'fire', label: 'Огонь', color: '#fef08a' }])
      return { sub, hero, y: 0.2, aim: 0.2, shots: [], germs: [], bubbles: [], spawn: 0.4, kills: 0, need: Math.max(need, lessons.length), hp: 4, oxy: 140, cool: 0, auto: 0, lessons, saved: 0 }
    },
    pointer(state, api) { state.aim = api.pointer.ny * 1.6 },
    action(state, id) { if (id === 'fire') state.auto = 0.45 },
    update(state, dt, api) {
      state.y += (state.aim - state.y) * Math.min(1, dt * 5)
      state.sub.position.y = state.y
      state.oxy -= (1.1 + api.level * 0.25) * dt
      state.spawn -= dt
      const firing = api.level < 3 || api.pointer.down || state.auto > 0
      state.auto = Math.max(0, (state.auto || 0) - dt)
      if (firing && state.cool <= 0) {
        state.cool = 0.18
        const shot = mesh(geo('shot', () => new THREE.SphereGeometry(0.08, 8, 6)), mat(0xfef08a, { emissive: 0xfacc15, emissiveIntensity: 0.6 }), -1.5, state.y, 0)
        api.world.add(shot)
        state.shots.push({ mesh: shot, x: -1.5, y: state.y })
      }
      state.cool = (state.cool || 0) - dt
      if (state.spawn <= 0 && state.kills < state.need) {
        state.spawn = api.level >= 3 ? 0.7 : 1.1
        const y = api.level === 1 ? state.y : state.y + (Math.random() - 0.5) * (api.level === 2 ? 0.5 : 1.1)
        const boss = api.level >= 3 && state.kills >= state.need - 1
        const germ = mesh(geo('germ', () => new THREE.SphereGeometry(boss ? 0.42 : 0.22, 12, 10)), mat(boss ? 0x6d28d9 : 0x22c55e), 4.2, y, 0)
        api.world.add(germ)
        state.germs.push({ mesh: germ, x: 4.2, y, hp: boss ? 4 : 1, boss })
        if (boss) api.say('Вирус. Держи лодку на его высоте.')
      }
      if (Math.random() < dt) {
        const bubble = mesh(geo('bubble', () => new THREE.SphereGeometry(0.1, 8, 6)), mat(0xecfeff, { transparent: true, opacity: 0.8 }), 3, state.y, 0.2)
        api.world.add(bubble)
        state.bubbles.push({ mesh: bubble, x: 3, y: state.y })
      }
      state.shots.forEach((shot) => { shot.x += dt * 4.5; shot.mesh.position.x = shot.x })
      state.germs.forEach((germ) => {
        germ.x -= dt * (germ.boss ? 0.7 : 1.3)
        germ.mesh.position.x = germ.x
        if (germ.x < -1.6 && Math.abs(germ.y - state.y) < 0.45) {
          germ.dead = true
          state.hp -= 1
          api.say('Микроб коснулся лодки. Уйди в сторону.')
          if (state.hp <= 0) api.lose('Лодка помята.')
        }
        state.shots.forEach((shot) => {
          if (shot.dead || germ.dead) return
          if (Math.abs(shot.x - germ.x) < 0.35 && Math.abs(shot.y - germ.y) < 0.35) {
            shot.dead = true
            germ.hp -= 1
            if (germ.hp <= 0) {
              germ.dead = true
              state.kills += 1
              const lesson = state.lessons[state.saved]
              if (lesson) { state.saved += 1; api.award(lesson.id); api.say(lesson.because) }
              beep(620, 0.05, 'triangle', 0.03)
            }
          }
        })
      })
      state.bubbles.forEach((bubble) => {
        bubble.x -= dt * 1.4
        bubble.mesh.position.x = bubble.x
        if (Math.abs(bubble.x + 2.2) < 0.4 && Math.abs(bubble.y - state.y) < 0.4) {
          bubble.dead = true
          state.oxy = Math.min(120, state.oxy + 18)
        }
      })
      sweep(state, api)
      api.setGoal('Сбей микробов: ' + state.kills + ' / ' + state.need)
      api.setProgress(state.kills / state.need)
      api.mark(api.level >= 3 ? 'fire' : '')
      if (state.oxy <= 0) api.lose('Воздух кончился. Лови пузырьки.')
      if (state.kills >= state.need) api.win()
    },
    decorate(state, api) { tickBuddy(state.sub.children[1], api.time, 'idle') }
  }
}

function sweep(state, api) {
  ;['shots', 'germs', 'bubbles'].forEach((key) => {
    state[key] = state[key].filter((item) => {
      const gone = item.dead || item.x > 8 || item.x < -4
      if (gone) api.world.remove(item.mesh)
      return !gone
    })
  })
}
