/* Живой остров-штаб: семь объёмных миров и подписи над ними. */
import * as THREE from 'three'
import { createStage, ground, mesh, geo, mat, tree, makeBuddy, tickBuddy, cloud, binMesh } from '../engine/kit.js'

const SPOTS = [
  { id: 'space', x: -4.4, z: -0.6 },
  { id: 'eco', x: -2.2, z: 1.1 },
  { id: 'time', x: 0, z: -1.3 },
  { id: 'city', x: 2.2, z: 1.1 },
  { id: 'forest', x: 4.4, z: -0.6 },
  { id: 'body', x: -1.5, z: 2.6 },
  { id: 'russia', x: 1.7, z: 2.6 }
]

export function mountIsland(canvas) {
  const stage = createStage(canvas, { sky: 0x7dd3fc, fog: 0xbae6fd, cam: [0, 7.2, 9.2], fov: 40, bloomStrength: 0.22 })
  stage.scene.add(ground(0x4ade80, 11))
  stage.scene.add(mesh(geo('water-ring', () => new THREE.RingGeometry(11.2, 16, 40)), mat(0x38bdf8, { roughness: 0.2 }), 0, -0.02, 0))
  const water = stage.scene.children[stage.scene.children.length - 1]
  water.rotation.x = -Math.PI / 2
  for (let i = 0; i < 5; i += 1) stage.scene.add(cloud(-6 + i * 3, 4.5, -5))
  const groups = SPOTS.map((spot) => {
    const group = build(spot.id)
    group.position.set(spot.x, 0, spot.z)
    stage.scene.add(group)
    return { ...spot, group }
  })
  const hero = makeBuddy('guard', 0xfbbf24)
  hero.position.set(0, 0, 0.4)
  stage.scene.add(hero)
  let frame = 0
  let alive = true
  function tick() {
    if (!alive) return
    frame = requestAnimationFrame(tick)
    const time = performance.now() / 1000
    stage.resize()
    groups.forEach((spot, index) => {
      spot.group.position.y = Math.sin(time * 1.4 + index) * 0.08
      spot.group.rotation.y = Math.sin(time * 0.6 + index) * 0.25
    })
    tickBuddy(hero, time, 'wave')
    stage.camera.position.x = Math.sin(time * 0.15) * 0.4
    stage.camera.lookAt(0, 0.6, 0)
    stage.render()
  }
  frame = requestAnimationFrame(tick)
  const onResize = () => stage.resize()
  window.addEventListener('resize', onResize)
  return {
    project() {
      const width = canvas.clientWidth || 1
      const height = canvas.clientHeight || 1
      return groups.map((spot) => {
        const point = new THREE.Vector3(spot.x, 1.8, spot.z)
        point.project(stage.camera)
        return {
          id: spot.id,
          left: (point.x * 0.5 + 0.5) * width,
          top: (-point.y * 0.5 + 0.5) * height
        }
      })
    },
    destroy() {
      alive = false
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      stage.dispose()
    }
  }
}

function build(id) {
  const group = new THREE.Group()
  const pad = mesh(geo('isle-pad', () => new THREE.CylinderGeometry(0.85, 0.95, 0.16, 16)), mat(0xfef3c7), 0, 0.08, 0)
  group.add(pad)
  if (id === 'space') {
    const planet = mesh(geo('isle-planet', () => new THREE.SphereGeometry(0.42, 16, 12)), mat(0x38bdf8), 0, 0.7, 0)
    const ring = mesh(geo('isle-ring', () => new THREE.TorusGeometry(0.62, 0.05, 8, 20)), mat(0xfde68a), 0, 0.7, 0)
    ring.rotation.x = 1.2
    const rocket = mesh(geo('isle-rocket', () => new THREE.ConeGeometry(0.08, 0.28, 8)), mat(0xf8fafc), 0.7, 1.05, 0)
    group.add(planet, ring, rocket)
  } else if (id === 'eco') {
    group.add(mesh(geo('isle-earth', () => new THREE.SphereGeometry(0.4, 16, 12)), mat(0x22c55e), 0, 0.7, 0))
    const bin = binMesh(0xfacc15)
    bin.scale.setScalar(0.45)
    bin.position.set(0.45, 0, 0.2)
    group.add(bin)
  } else if (id === 'time') {
    group.add(mesh(geo('isle-gear', () => new THREE.TorusGeometry(0.28, 0.08, 8, 12)), mat(0xf59e0b, { metalness: 0.4 }), 0, 0.7, 0))
    group.add(mesh(geo('isle-portal', () => new THREE.TorusGeometry(0.22, 0.04, 8, 16)), mat(0x67e8f9, { emissive: 0x22d3ee, emissiveIntensity: 0.6 }), 0.35, 0.9, 0))
  } else if (id === 'city') {
    group.add(mesh(geo('isle-pole', () => new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8)), mat(0x334155), 0, 0.5, 0))
    group.add(mesh(geo('isle-light', () => new THREE.SphereGeometry(0.1, 10, 8)), mat(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.5 }), 0, 0.95, 0))
    group.add(mesh(geo('isle-shield', () => new THREE.BoxGeometry(0.28, 0.34, 0.06)), mat(0xf97316), 0.4, 0.6, 0))
  } else if (id === 'forest') {
    group.add(tree(0, 0, 0x166534))
    const hare = makeBuddy('hare', 0xf8fafc)
    hare.scale.setScalar(0.35)
    hare.position.set(0.4, 0, 0.3)
    group.add(hare)
  } else if (id === 'body') {
    group.add(mesh(geo('isle-bubble', () => new THREE.SphereGeometry(0.48, 16, 12)), mat(0x99f6e4, { transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.7, 0))
    group.add(mesh(geo('isle-heart', () => new THREE.SphereGeometry(0.16, 12, 10)), mat(0xfb7185, { emissive: 0xfb7185, emissiveIntensity: 0.3 }), 0, 0.75, 0))
  } else {
    group.add(mesh(geo('isle-map', () => new THREE.BoxGeometry(0.9, 0.08, 0.55)), mat(0x2563eb), 0, 0.4, 0))
    const runner = makeBuddy('hare', 0xfde68a)
    runner.scale.setScalar(0.32)
    runner.position.set(0.15, 0.15, 0.15)
    group.add(runner)
  }
  return group
}
