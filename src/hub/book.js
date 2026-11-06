/* Маленькая модель в энциклопедии: её можно крутить пальцем. */
import * as THREE from 'three'
import { pixelRatio } from '../engine/quality.js'

const COLORS = {
  city: 0xf59e0b,
  space: 0x38bdf8,
  forest: 0x22c55e,
  body: 0xfb7185,
  russia: 0xf97316,
  time: 0xfbbf24,
  eco: 0xa78bfa
}

export function mountViewer(canvas, worldId) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(pixelRatio())
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20)
  camera.position.set(0, 0.8, 3.4)
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xfff7ed, 1.6)
  key.position.set(2, 3, 4)
  scene.add(key)
  const group = new THREE.Group()
  const color = COLORS[worldId] || 0xfbbf24
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15, emissive: color, emissiveIntensity: 0.12 })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 18), mat))
  if (worldId === 'space') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.06, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.35 })
    )
    ring.rotation.x = 1.1
    group.add(ring)
  } else if (worldId === 'forest') {
    group.add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 })))
  } else if (worldId === 'body') {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), mat)
    lobe.position.x = 0.28
    group.add(lobe)
  }
  scene.add(group)
  let alive = true
  let frame = 0
  let drag = false
  function resize() {
    const width = canvas.clientWidth || 240
    const height = canvas.clientHeight || 180
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  function tick() {
    if (!alive) return
    frame = requestAnimationFrame(tick)
    if (!drag) group.rotation.y += 0.01
    renderer.render(scene, camera)
  }
  function onDown() { drag = true }
  function onUp() { drag = false }
  function onMove(event) {
    if (!drag) return
    group.rotation.y += event.movementX * 0.01
    group.rotation.x += event.movementY * 0.01
  }
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointermove', onMove)
  resize()
  tick()
  return function destroy() {
    alive = false
    cancelAnimationFrame(frame)
    canvas.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointermove', onMove)
    renderer.dispose()
  }
}
