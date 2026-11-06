/* Космический гонщик. Уровень 1: держи центр и собирай планеты.
   Уровень 2: обходи камни. Уровень 3: маяки вокруг чёрной дыры. */
import * as THREE from 'three'
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { mesh, geo, mat, makeBuddy, tickBuddy } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

const PACKS = [
  [['sun', 'Солнце', 0xfde047], ['mercury', 'Меркурий', 0xd6d3d1], ['venus', 'Венера', 0xf59e0b], ['earth', 'Земля', 0x38bdf8]],
  [['moon', 'Луна', 0xe2e8f0], ['daynight', 'День и ночь', 0x1e3a8a], ['seasons', 'Времена года', 0x4ade80], ['mars', 'Марс', 0xf43f5e]],
  [['jupiter', 'Юпитер', 0xfbbf24], ['saturn', 'Сатурн', 0xfcd34d], ['uranus', 'Уран', 0x67e8f9], ['neptune', 'Нептун', 0x2563eb]]
]

export function mount(root, hub) {
  audioContext()
  const stop = loop(180, (tick) => beep([220, 277, 330, 392][tick % 4], 0.1, 'sawtooth', 0.025))
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  return {
    id: 'space',
    winTitle: level >= 3 ? 'Дыра позади' : 'Курс собран',
    loseTitle: 'Корабль на ремонте',
    winText: 'Планеты стали трофеями.',
    loseText: 'Щиты сели. Трасса на месте.',
    howto: [
      'Веди ракету пальцем по экрану.',
      'Влетай в планеты. Камни облетай.',
      level >= 3 ? 'У дыры собери три жёлтых маяка, не центр.' : 'На первом круге держи середину.'
    ],
    stage: { sky: 0x07010f, fog: 0x07010f, fogNear: 16, fogFar: 48, cam: [0, 2.2, 8], rim: 0xf472b6, bloomStrength: 0.45 },
    create(api) {
      const stars = []
      for (let i = 0; i < 200; i += 1) stars.push((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 16, -Math.random() * 40)
      api.world.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(stars, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 })))
      const ship = new THREE.Group()
      ship.add(mesh(geo('hull', () => new THREE.ConeGeometry(0.22, 0.9, 10)), mat(0xe2e8f0, { metalness: 0.45, roughness: 0.25 }), 0, 0, 0))
      const cabin = makeBuddy('cat', 0xfde68a)
      cabin.scale.setScalar(0.35)
      cabin.position.y = 0.15
      ship.add(cabin)
      api.world.add(ship)
      const course = []
      const pack = PACKS[Math.min(2, level - 1)]
      pack.forEach((item, index) => {
        const z = 8 + index * 7
        if (level > 1) {
          const rock = mesh(geo('aster', () => new THREE.DodecahedronGeometry(0.35, 0)), mat(0x6b7280, { roughness: 0.85 }), index % 2 ? -2.4 : 2.4, 0.4, -z)
          api.world.add(rock)
          course.push({ kind: 'rock', mesh: rock, z, x: rock.position.x, y: 0.4 })
        }
        const planet = mesh(geo('planet', () => new THREE.SphereGeometry(0.55, 18, 14)), mat(item[2], { emissive: item[2], emissiveIntensity: 0.25 }), 0, 0.6, -z)
        if (item[0] === 'saturn') {
          const ring = mesh(geo('sring', () => new THREE.TorusGeometry(0.85, 0.05, 8, 24)), mat(0xfde68a), 0, 0, 0)
          ring.rotation.x = 1.1
          planet.add(ring)
        }
        api.world.add(planet)
        course.push({ kind: 'planet', mesh: planet, z, x: 0, y: 0.6, id: item[0], name: item[1] })
      })
      const hole = mesh(geo('hole', () => new THREE.SphereGeometry(0.7, 18, 12)), mat(0x020617, { roughness: 1 }), 0, 0.5, -6)
      hole.visible = false
      api.world.add(hole)
      const state = { ship, cabin, course, progress: 0, x: 0, y: 0.7, tx: 0, ty: 0.7, hp: level === 1 ? 5 : 3, got: 0, need: pack.length, boss: level >= 3, bossOn: false, beacons: 0, hole }
      api.setGoal(level >= 3 ? 'Собери 3 маяка у края дыры' : 'Собери ' + pack.length + ' планеты')
      api.setActions([{ id: 'stay', label: 'Держи центр', color: '#22d3ee' }])
      api.say(level === 1 ? 'Палец в середину экрана — и планеты сами на курсе.' : 'Камни по краям. Планеты в середине.')
      return state
    },
    pointer(state, api) {
      state.tx = api.pointer.nx * (api.level === 1 ? 1.2 : 3.2)
      state.ty = 0.7 + api.pointer.ny * 1.1
    },
    action(state, id, api) {
      if (id === 'stay') { state.tx = 0; state.ty = 0.7 }
    },
    update(state, dt, api) {
      state.x += (state.tx - state.x) * Math.min(1, dt * 4)
      state.y += (state.ty - state.y) * Math.min(1, dt * 4)
      state.ship.position.set(state.x, state.y, 0)
      state.ship.rotation.z = (state.tx - state.x) * -0.4
      if (!state.bossOn) {
        state.progress += (api.level >= 3 ? 5.5 : 4.2) * dt
        state.course.forEach((item) => {
          if (item.gone) return
          const rel = item.z - state.progress
          item.mesh.position.z = -rel
          if (rel < 1.2 && rel > -0.4 && Math.hypot(state.x - item.x, state.y - item.y) < (item.kind === 'rock' ? 0.7 : 0.95)) {
            item.gone = true
            item.mesh.visible = false
            if (item.kind === 'rock') {
              state.hp -= 1
              api.oops('Камень! Уводи ракету в сторону.')
              if (state.hp <= 0) api.lose('Щиты кончились.')
            } else {
              state.got += 1
              api.award(item.id)
              const extra = itemsForLevel('space', api.level)[state.got - 1]
              if (extra && extra.id !== item.id) api.award(extra.id)
              api.say(item.name + ' — трофей.')
              beep(660, 0.06, 'square', 0.04)
              api.setProgress(state.got / state.need)
              if (state.got >= state.need) {
                if (state.boss) startBoss(state, api)
                else api.win()
              }
            }
          }
        })
      } else {
        state.coreCool = (state.coreCool || 0) - dt
        if (state.coreCool <= 0 && Math.hypot(state.x, state.y - 0.5) < 0.65) {
          state.coreCool = 0.9
          state.hp -= 1
          api.oops('Центр дыры тянет. Держись маяков.')
          if (state.hp <= 0) api.lose('Корабль затянуло.')
        }
        state.beaconsMeshes.forEach((beacon) => {
          if (beacon.got) return
          beacon.angle += dt * 1.3
          beacon.mesh.position.set(Math.cos(beacon.angle) * 2.05, 0.7 + Math.sin(beacon.angle) * 0.2, -5)
          if (Math.hypot(state.x - beacon.mesh.position.x, state.y - beacon.mesh.position.y) < 0.7) {
            beacon.got = true
            beacon.mesh.visible = false
            state.beacons += 1
            api.award('space-boss')
            api.setProgress(state.beacons / 3)
            if (state.beacons >= 3) api.win()
          }
        })
      }
      api.stage.camera.position.x = state.x * 0.3
      api.stage.camera.lookAt(state.x, state.y, -8)
    },
    decorate(state, api) { tickBuddy(state.cabin, api.time, 'run') }
  }
}

function startBoss(state, api) {
  state.bossOn = true
  state.x = 2.3
  state.tx = 2.3
  state.hole.visible = true
  state.course.forEach((item) => { item.mesh.visible = false })
  state.beaconsMeshes = [0, 1, 2].map((index) => {
    const beacon = mesh(geo('beacon', () => new THREE.OctahedronGeometry(0.22)), mat(0xfef08a, { emissive: 0xfacc15, emissiveIntensity: 0.8 }), 2, 1, -5)
    api.world.add(beacon)
    return { mesh: beacon, angle: index * 2.1, got: false }
  })
  api.setGoal('Собери 3 маяка, не влетай в центр')
  api.say('Чёрная дыра не выпускает свет. Лети по краю.')
}
