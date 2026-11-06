/* Общие трёхмерные детали: сцена, свет, герои и вещи.
   Геометрия кэшируется. Уникальные материалы уничтожает игра. */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { PMREMGenerator } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { pixelRatio, qualityTier } from './quality.js'

const GEO = new Map()

export function geo(key, build) {
  if (!GEO.has(key)) {
    const geometry = build()
    geometry.userData.shared = true
    GEO.set(key, geometry)
  }
  return GEO.get(key)
}

export function mat(color, extra) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color,
    roughness: 0.45,
    metalness: 0.08
  }, extra || {}))
}

export function createStage(canvas, options) {
  const high = qualityTier() === 'high' && options.bloom !== false
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: high, alpha: !!options.alpha })
  renderer.setPixelRatio(pixelRatio())
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  if (high) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(options.sky || 0x87ceeb)
  scene.fog = new THREE.Fog(options.fog || options.sky || 0x87ceeb, options.fogNear || 12, options.fogFar || 36)
  const camera = new THREE.PerspectiveCamera(options.fov || 48, 1, 0.1, 80)
  const cam = options.cam || [0, 4, 9]
  const look = options.look || [0, 0.8, 0]
  camera.position.set(cam[0], cam[1], cam[2])
  camera.lookAt(look[0], look[1], look[2])
  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.add(new THREE.AmbientLight(options.ambient || 0xfff7ed, 0.38))
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.45)
  sun.position.set(6, 10, 4)
  if (high) {
    sun.castShadow = true
    sun.shadow.mapSize.set(512, 512)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 30
    sun.shadow.camera.left = -10
    sun.shadow.camera.right = 10
    sun.shadow.camera.top = 10
    sun.shadow.camera.bottom = -10
  }
  scene.add(sun)
  const rim = new THREE.DirectionalLight(options.rim || 0x67e8f9, 0.9)
  rim.position.set(-5, 3, -4)
  scene.add(rim)
  let composer = null
  if (high) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(320, 180), options.bloomStrength || 0.16, 0.32, 0.94))
    composer.addPass(new OutputPass())
  }
  function resize() {
    const width = canvas.clientWidth || 800
    const height = canvas.clientHeight || 450
    renderer.setSize(width, height, false)
    if (composer) composer.setSize(width, height)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  function render() {
    if (composer) composer.render()
    else renderer.render(scene, camera)
  }
  function dispose() {
    scene.environment?.dispose?.()
    pmrem.dispose()
    composer?.dispose()
    renderer.dispose()
  }
  resize()
  return { renderer, scene, camera, sun, high, resize, render, dispose }
}

export function ground(color, size) {
  const mesh = new THREE.Mesh(
    geo('ground-' + (size || 24), () => new THREE.CircleGeometry(size || 24, 40)),
    mat(color, { roughness: 0.85 })
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  return mesh
}

export function mesh(geometry, material, x, y, z) {
  const item = new THREE.Mesh(geometry, material)
  item.position.set(x || 0, y || 0, z || 0)
  item.castShadow = true
  item.receiveShadow = true
  return item
}

export function tree(x, z, leaf) {
  const group = new THREE.Group()
  const trunk = mesh(geo('trunk', () => new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8)), mat(0x92400e, { roughness: 0.8 }), 0, 0.4, 0)
  const top = mesh(geo('leaf', () => new THREE.SphereGeometry(0.55, 14, 10)), mat(leaf || 0x15803d, { roughness: 0.7 }), 0, 1.15, 0)
  const top2 = mesh(geo('leaf2', () => new THREE.SphereGeometry(0.38, 12, 8)), mat(leaf || 0x22c55e, { roughness: 0.65 }), 0.28, 1.45, 0.1)
  group.add(trunk, top, top2)
  group.position.set(x, 0, z)
  return group
}

export function house(x, z, wall) {
  const group = new THREE.Group()
  const body = mesh(geo('house', () => new THREE.BoxGeometry(1.3, 0.9, 1.1)), mat(wall || 0xfde68a), 0, 0.45, 0)
  const roof = mesh(geo('roof', () => new THREE.ConeGeometry(1.05, 0.55, 4)), mat(0xdc2626, { roughness: 0.6 }), 0, 1.15, 0)
  roof.rotation.y = Math.PI / 4
  const door = mesh(geo('door', () => new THREE.BoxGeometry(0.28, 0.42, 0.06)), mat(0x7c2d12), 0, 0.24, 0.56)
  const window = mesh(geo('win', () => new THREE.BoxGeometry(0.22, 0.22, 0.06)), mat(0xbae6fd, { emissive: 0x7dd3fc, emissiveIntensity: 0.4 }), 0.38, 0.55, 0.56)
  group.add(body, roof, door, window)
  group.position.set(x, 0, z)
  return group
}

export function rock(x, z, scale) {
  const item = mesh(geo('rock', () => new THREE.DodecahedronGeometry(0.28, 0)), mat(0x78716c, { roughness: 0.9 }), x, 0.18, z)
  item.scale.setScalar(scale || 1)
  return item
}

export function flower(x, z, color) {
  const group = new THREE.Group()
  group.add(mesh(geo('stem', () => new THREE.CylinderGeometry(0.02, 0.02, 0.25, 5)), mat(0x166534), 0, 0.12, 0))
  group.add(mesh(geo('petal', () => new THREE.SphereGeometry(0.07, 8, 6)), mat(color || 0xf472b6), 0, 0.28, 0))
  group.position.set(x, 0, z)
  return group
}

export function cloud(x, y, z) {
  const group = new THREE.Group()
  const puff = geo('puff', () => new THREE.SphereGeometry(0.35, 10, 8))
  const material = mat(0xffffff, { roughness: 0.95, transparent: true, opacity: 0.92 })
  group.add(mesh(puff, material, 0, 0, 0), mesh(puff, material, 0.4, 0.05, 0), mesh(puff, material, -0.35, 0.02, 0.05))
  group.position.set(x, y, z)
  return group
}

export function makeBuddy(kind, color) {
  const group = new THREE.Group()
  const cloth = mat(color || 0xf59e0b, { roughness: 0.4 })
  const skin = mat(0xffe0c2, { roughness: 0.55 })
  const dark = mat(0x1e1b4b)
  const body = mesh(geo('buddy-body', () => new THREE.CapsuleGeometry(0.28, 0.42, 6, 10)), cloth, 0, 0.78, 0)
  const head = mesh(geo('buddy-head', () => new THREE.SphereGeometry(0.26, 18, 14)), skin, 0, 1.42, 0)
  const eyeWhite = geo('eye-w', () => new THREE.SphereGeometry(0.055, 10, 8))
  const pupil = geo('pupil', () => new THREE.SphereGeometry(0.028, 8, 6))
  const leftWhite = mesh(eyeWhite, mat(0xffffff, { roughness: 0.2 }), -0.09, 1.46, 0.2)
  const rightWhite = mesh(eyeWhite, mat(0xffffff, { roughness: 0.2 }), 0.09, 1.46, 0.2)
  const leftPupil = mesh(pupil, dark, -0.09, 1.45, 0.24)
  const rightPupil = mesh(pupil, dark, 0.09, 1.45, 0.24)
  const smile = mesh(geo('smile', () => new THREE.TorusGeometry(0.07, 0.015, 6, 10, Math.PI)), mat(0x9f1239), 0, 1.32, 0.22)
  smile.rotation.z = Math.PI
  const arm = geo('buddy-arm', () => new THREE.CapsuleGeometry(0.07, 0.22, 4, 8))
  const leftArm = mesh(arm, cloth, -0.38, 0.9, 0)
  const rightArm = mesh(arm, cloth, 0.38, 0.9, 0)
  const leg = geo('buddy-leg', () => new THREE.CapsuleGeometry(0.08, 0.22, 4, 8))
  const leftLeg = mesh(leg, dark, -0.12, 0.28, 0)
  const rightLeg = mesh(leg, dark, 0.12, 0.28, 0)
  group.add(body, head, leftWhite, rightWhite, leftPupil, rightPupil, smile, leftArm, rightArm, leftLeg, rightLeg)
  if (kind === 'cat' || kind === 'fox' || kind === 'hare') {
    const ear = geo('buddy-ear', () => new THREE.ConeGeometry(0.08, 0.22, 6))
    group.add(mesh(ear, cloth, -0.14, 1.7, 0), mesh(ear, cloth, 0.14, 1.7, 0))
  }
  if (kind === 'robot') {
    const visor = mesh(geo('visor', () => new THREE.BoxGeometry(0.28, 0.1, 0.06)), mat(0x22d3ee, { emissive: 0x06b6d4, emissiveIntensity: 0.7 }), 0, 1.46, 0.22)
    group.add(visor)
  }
  if (kind === 'guard') {
    group.add(mesh(geo('vest', () => new THREE.BoxGeometry(0.42, 0.28, 0.2)), mat(0xf97316, { emissive: 0xf97316, emissiveIntensity: 0.15 }), 0, 0.9, 0.08))
  }
  group.userData.parts = { body, leftArm, rightArm, leftLeg, rightLeg, leftPupil, rightPupil, smile }
  return group
}

export function tickBuddy(group, time, mood) {
  const parts = group.userData.parts
  if (!parts) return
  const run = mood === 'run'
  parts.body.scale.y = 1 + Math.sin(time * 3) * 0.03
  parts.leftLeg.rotation.x = run ? Math.sin(time * 8) * 0.6 : Math.sin(time * 2) * 0.08
  parts.rightLeg.rotation.x = run ? -Math.sin(time * 8) * 0.6 : -Math.sin(time * 2) * 0.08
  parts.leftArm.rotation.x = run ? -Math.sin(time * 8) * 0.5 : 0
  parts.rightArm.rotation.z = mood === 'wave' ? -0.8 + Math.sin(time * 10) * 0.5 : (run ? Math.sin(time * 8) * 0.4 : 0)
  const blink = Math.sin(time * 1.6) > 0.96
  parts.leftPupil.scale.y = blink ? 0.15 : 1
  parts.rightPupil.scale.y = blink ? 0.15 : 1
  if (mood === 'happy') parts.smile.scale.setScalar(1.2)
  if (mood === 'scared') parts.smile.rotation.z = 0
  else parts.smile.rotation.z = Math.PI
  if (mood === 'jump') group.position.y = Math.abs(Math.sin(time * 8)) * 0.35
}

export function bottle(color) {
  const group = new THREE.Group()
  group.add(mesh(geo('bottle', () => new THREE.CylinderGeometry(0.16, 0.18, 0.55, 12)), mat(color || 0xfacc15, { transparent: true, opacity: 0.9, roughness: 0.2 }), 0, 0.35, 0))
  group.add(mesh(geo('neck', () => new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10)), mat(color || 0xfacc15, { roughness: 0.2 }), 0, 0.7, 0))
  group.add(mesh(geo('cap', () => new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10)), mat(0xef4444), 0, 0.82, 0))
  return group
}

export function paperSheet() {
  const item = mesh(geo('paper', () => new THREE.BoxGeometry(0.55, 0.04, 0.7)), mat(0xdbeafe, { roughness: 0.8 }), 0, 0.35, 0)
  item.rotation.z = 0.2
  return item
}

export function glassJar() {
  const group = new THREE.Group()
  group.add(mesh(geo('jar', () => new THREE.CylinderGeometry(0.18, 0.16, 0.4, 12)), mat(0xbbf7d0, { transparent: true, opacity: 0.75, roughness: 0.1 }), 0, 0.28, 0))
  group.add(mesh(geo('lid', () => new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12)), mat(0x9ca3af, { metalness: 0.6, roughness: 0.3 }), 0, 0.5, 0))
  return group
}

export function peel() {
  const item = mesh(geo('peel', () => new THREE.TorusGeometry(0.16, 0.05, 8, 14, Math.PI * 1.4)), mat(0xfacc15, { roughness: 0.55 }), 0, 0.2, 0)
  item.rotation.x = 1
  return item
}

export function battery() {
  const group = new THREE.Group()
  group.add(mesh(geo('cell', () => new THREE.CylinderGeometry(0.1, 0.1, 0.36, 10)), mat(0x111827), 0, 0.24, 0))
  group.add(mesh(geo('plus', () => new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8)), mat(0xf87171, { metalness: 0.4 }), 0, 0.44, 0))
  return group
}

export function binMesh(color) {
  const group = new THREE.Group()
  const body = mesh(geo('bin', () => new THREE.CylinderGeometry(0.34, 0.28, 0.7, 14)), mat(color, { roughness: 0.5 }), 0, 0.35, 0)
  const rim = mesh(geo('bin-rim', () => new THREE.TorusGeometry(0.34, 0.04, 8, 16)), mat(0xffffff, { roughness: 0.4 }), 0, 0.7, 0)
  rim.rotation.x = Math.PI / 2
  group.add(body, rim)
  return group
}

export function label(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color || '#111827'
  ctx.fillRect(0, 0, 256, 96)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 42px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 50)
  const texture = new THREE.CanvasTexture(canvas)
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), new THREE.MeshBasicMaterial({ map: texture, transparent: true }))
  plane.userData.ownedGeo = true
  return plane
}

export function dress(scene, theme) {
  const props = []
  if (theme === 'space') {
    const stars = []
    for (let i = 0; i < 280; i += 1) stars.push((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 24, -Math.random() * 40)
    const points = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(stars, 3)),
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })
    )
    scene.add(points)
    for (let i = 0; i < 5; i += 1) {
      const ring = mesh(geo('neon-ring', () => new THREE.TorusGeometry(2.2 + i, 0.03, 8, 40)), mat(i % 2 ? 0x22d3ee : 0xf472b6, { emissive: 0x22d3ee, emissiveIntensity: 0.4 }), 0, 0, -8 - i * 4)
      ring.rotation.x = 1.2
      scene.add(ring)
    }
    return
  }
  const floor = theme === 'body' ? 0x0f766e : theme === 'time' ? 0x44403c : theme === 'eco' ? 0xf0b429 : theme === 'russia' ? 0x4d7c0f : theme === 'forest' ? 0x22c55e : 0x64748b
  scene.add(ground(floor, theme === 'body' ? 16 : 22))
  const spots = [[-6, -2], [-4, 2], [5, -3], [6, 2], [-2, -4], [3, 4], [-7, 3], [2, -5]]
  spots.forEach(([x, z], index) => {
    if (theme === 'city') props.push(index % 2 ? house(x, z, index % 3 ? 0xfecaca : 0xbfdbfe) : tree(x, z, 0x166534))
    else if (theme === 'forest') props.push(tree(x, z, index % 2 ? 0x166534 : 0x65a30d))
    else if (theme === 'eco') props.push(index % 2 ? tree(x, z, 0x15803d) : flower(x, z, index % 3 ? 0xf472b6 : 0xfacc15))
    else if (theme === 'russia') props.push(index % 2 ? tree(x, z, 0x14532d) : rock(x, z, 0.8 + (index % 3) * 0.3))
    else if (theme === 'time') props.push(rock(x, z, 1))
    else props.push(flower(x, z, 0xf9a8d4))
  })
  props.forEach((item) => scene.add(item))
  for (let i = 0; i < 4; i += 1) scene.add(cloud(-6 + i * 4, 4.2 + (i % 2) * 0.4, -6))
  for (let i = 0; i < 6; i += 1) scene.add(flower(-3 + i * 0.9, 1.5 + (i % 2) * 0.4, [0xf472b6, 0xfacc15, 0xfb7185][i % 3]))
}

export function disposeObject(object) {
  object.traverse((node) => {
    if (node.geometry && !node.geometry.userData.shared) node.geometry.dispose()
    if (!node.material) return
    const list = Array.isArray(node.material) ? node.material : [node.material]
    list.forEach((material) => {
      if (material.map) material.map.dispose()
      material.dispose()
    })
  })
}
