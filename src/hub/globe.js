/* Объёмный глобус только для карты. Миры его не используют. */
import * as THREE from 'three'

export function mountGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40)
  camera.position.set(0, 0.2, 6.2)

  const texture = paintTexture()
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 48, 32),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.08 })
  )
  scene.add(globe)
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.86, 40, 24),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.16, side: THREE.BackSide })
  )
  scene.add(atmosphere)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.035, 8, 80),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  )
  ring.rotation.x = Math.PI / 2.4
  scene.add(ring)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const sun = new THREE.DirectionalLight(0xfff7d6, 1.4)
  sun.position.set(4, 3, 5)
  scene.add(sun)

  let frame = 0
  let alive = true
  function resize() {
    const width = canvas.clientWidth || 320
    const height = canvas.clientHeight || 320
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  function tick() {
    if (!alive) return
    frame = requestAnimationFrame(tick)
    resize()
    globe.rotation.y += 0.003
    ring.rotation.z += 0.002
    renderer.render(scene, camera)
  }
  resize()
  tick()
  const onResize = () => resize()
  window.addEventListener('resize', onResize)
  return function destroy() {
    alive = false
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', onResize)
    texture.dispose()
    renderer.dispose()
  }
}

function paintTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, 256)
  sky.addColorStop(0, '#1d4ed8')
  sky.addColorStop(1, '#0e7490')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = '#4ade80'
  const blobs = [[80, 70, 50], [160, 110, 70], [260, 80, 46], [340, 140, 60], [430, 90, 40], [120, 170, 36]]
  blobs.forEach(([x, y, r]) => {
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.62, 0.4, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = '#fef3c7'
  ctx.fillRect(0, 118, 512, 8)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
