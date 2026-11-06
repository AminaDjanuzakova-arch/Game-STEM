/* Киношный вход и 3D-выбор хранителя. Миры сюда не заходят. */
import * as THREE from 'three'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { HEROES, PETS } from './cast.js'
import { makeHero, makePet, tickHero, cheer, tintColor } from '../engine/hero3d.js'
import { pixelRatio, qualityTier } from '../engine/quality.js'
import { audioContext, beep, loop } from '../audio.js'
import './gate.css'

export function mountGate(root, options) {
  audioContext()
  const stopMusic = loop(420, (tick) => {
    beep([392, 494, 587, 494, 659, 587][tick % 6], 0.18, 'triangle', 0.03)
  })
  const look = {
    hat: options.look?.hat || 'cap',
    cape: options.look?.cape || 'short',
    tint: options.look?.tint || 0
  }
  let heroIndex = Math.max(0, HEROES.findIndex((item) => item.id === (options.hero || 'sol')))
  let petId = options.pet || 'firefly'
  let mode = 'fly'
  root.innerHTML =
    '<div class="gate"><canvas data-gate></canvas>' +
    '<div class="gate-intro"><h1 class="gate-logo">Хранители планеты</h1>' +
    '<p>Хаос-король растащил знания по мирам. Верни их — и они станут силой.</p>' +
    '<button type="button" class="gate-play" data-play>Играть</button>' +
    '<button type="button" class="gate-skip" data-skip>Пропустить заставку</button></div>' +
    '<div class="gate-pick" hidden>' +
    '<div class="gate-box"><h2 data-hero-name></h2><p data-hero-line></p>' +
    '<input data-name maxlength="16" placeholder="Твоё имя" value="' + escapeAttr(options.name || '') + '"/>' +
    '<div class="swatches" data-tints></div><div class="choice-row" data-hats></div>' +
    '<div class="choice-row" data-capes></div><div class="choice-row" data-pets></div></div>' +
    '<div class="gate-nav"><button type="button" data-prev>Другой</button><button type="button" data-next>Дальше</button></div>' +
    '<div class="gate-box"><p>Шапка, плащ и питомец сразу видны на фигуре.</p>' +
    '<button type="button" class="gate-go" data-confirm>На глобус</button></div></div></div>'

  const canvas = root.querySelector('[data-gate]')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: qualityTier() === 'high' })
  renderer.setPixelRatio(pixelRatio())
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const high = qualityTier() === 'high'
  if (high) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x082f49, 18, 48)
  scene.background = new THREE.Color(0x082f49)
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
  camera.position.set(0, 16, 24)
  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  scene.add(new THREE.AmbientLight(0xcffafe, 0.45))
  const sun = new THREE.DirectionalLight(0xfff7ed, 2.2)
  sun.position.set(8, 14, 6)
  if (high) {
    sun.castShadow = true
    sun.shadow.mapSize.set(512, 512)
  }
  scene.add(sun)
  const rim = new THREE.DirectionalLight(0x67e8f9, 1.2)
  rim.position.set(-6, 4, -4)
  scene.add(rim)

  buildWorld(scene, high)
  const spots = [-4.6, -1.55, 1.55, 4.6]
  const heroes = HEROES.map((meta, index) => {
    const mesh = makeHero(meta.id, look)
    mesh.position.set(spots[index], 0, 0)
    mesh.userData.baseY = 0
    scene.add(mesh)
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.8, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfbbf24, emissiveIntensity: 0.35, roughness: 0.4 })
    )
    pad.position.set(spots[index], 0.06, 0)
    pad.receiveShadow = true
    scene.add(pad)
    return mesh
  })
  let pet = makePet(petId)
  pet.position.set(spots[heroIndex] + 0.7, 0.35, 0.4)
  scene.add(pet)

  const confetti = makeConfetti()
  scene.add(confetti)

  let composer = null
  if (high) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(320, 180), 0.35, 0.4, 0.85))
    composer.addPass(new OutputPass())
  }

  const lookAt = new THREE.Vector3(0, 1, 0)
  const goalPos = new THREE.Vector3()
  const goalLook = new THREE.Vector3()
  let frame = 0
  let alive = true
  let started = performance.now()

  function resize() {
    const width = canvas.clientWidth || root.clientWidth || 800
    const height = canvas.clientHeight || root.clientHeight || 600
    renderer.setSize(width, height, false)
    if (composer) composer.setSize(width, height)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  function tick() {
    if (!alive) return
    frame = requestAnimationFrame(tick)
    const time = performance.now() / 1000
    const fly = Math.min(1, (performance.now() - started) / 5200)
    if (mode === 'fly') {
      camera.position.set(Math.sin(fly * Math.PI) * 10, 16 - fly * 9, 24 - fly * 12)
      lookAt.set(0, 1.2, 0)
      camera.lookAt(lookAt)
    } else {
      const spot = spots[heroIndex]
      goalPos.set(spot, 2.4, 6.2)
      goalLook.set(spot, 1.3, 0)
      camera.position.lerp(goalPos, 0.06)
      lookAt.lerp(goalLook, 0.08)
      camera.lookAt(lookAt)
    }
    heroes.forEach((mesh, index) => tickHero(mesh, time, index === heroIndex && mode === 'pick'))
    pet.position.x += (spots[heroIndex] + 0.75 - pet.position.x) * 0.08
    pet.position.y = 0.45 + Math.sin(time * 3) * 0.08
    pet.rotation.y += 0.02
    if (confetti.userData.life > 0) {
      confetti.userData.life -= 0.016
      const positions = confetti.geometry.attributes.position
      for (let i = 0; i < positions.count; i += 1) {
        positions.setY(i, positions.getY(i) - 0.03)
      }
      positions.needsUpdate = true
    }
    if (composer) composer.render()
    else renderer.render(scene, camera)
  }
  resize()
  tick()
  window.addEventListener('resize', resize)

  function showPick() {
    mode = 'pick'
    root.querySelector('.gate-intro').hidden = true
    root.querySelector('.gate-pick').hidden = false
    paintPick()
    beep(523, 0.1, 'triangle', 0.04)
  }
  function paintPick() {
    const meta = HEROES[heroIndex]
    root.querySelector('[data-hero-name]').textContent = meta.name + ' · ' + meta.trait
    root.querySelector('[data-hero-line]').textContent = meta.line
    rebuildLooks()
  }
  function rebuildLooks() {
    heroes.forEach((mesh, index) => {
      const spot = mesh.position.x
      scene.remove(mesh)
      dropMaterials(mesh)
      const next = makeHero(HEROES[index].id, look)
      next.position.set(spot, 0, 0)
      heroes[index] = next
      scene.add(next)
    })
  }
  function burst() {
    cheer(heroes[heroIndex])
    const positions = confetti.geometry.attributes.position
    const spot = spots[heroIndex]
    for (let i = 0; i < positions.count; i += 1) {
      positions.setXYZ(i, spot + (Math.random() - 0.5) * 2, 1.6 + Math.random(), (Math.random() - 0.5) * 2)
    }
    positions.needsUpdate = true
    confetti.userData.life = 1
    beep(784, 0.12, 'triangle', 0.05)
  }

  root.querySelector('[data-play]').addEventListener('click', showPick)
  root.querySelector('[data-skip]').addEventListener('click', showPick)
  root.querySelector('[data-prev]').addEventListener('click', () => {
    heroIndex = (heroIndex + HEROES.length - 1) % HEROES.length
    paintPick()
  })
  root.querySelector('[data-next]').addEventListener('click', () => {
    heroIndex = (heroIndex + 1) % HEROES.length
    paintPick()
  })
  fillChoices('[data-tints]', [0, 1, 2, 3], look.tint, (value) => {
    look.tint = value
    paintPick()
  }, (value) => '<button type="button" style="background:' + hex(tintColor(value)) + '" data-value="' + value + '"></button>')
  fillChoices('[data-hats]', [['none', 'Без шапки'], ['cap', 'Кепка'], ['crown', 'Корона'], ['helm', 'Шлем']], look.hat, (value) => {
    look.hat = value
    paintPick()
  })
  fillChoices('[data-capes]', [['none', 'Без плаща'], ['short', 'Плащ'], ['long', 'Длинный']], look.cape, (value) => {
    look.cape = value
    paintPick()
  })
  fillChoices('[data-pets]', PETS.map((petMeta) => [petMeta.id, petMeta.name]), petId, (value) => {
    petId = value
    scene.remove(pet)
    pet = makePet(petId)
    scene.add(pet)
  })
  root.querySelector('[data-confirm]').addEventListener('click', () => {
    burst()
    const name = root.querySelector('[data-name]').value.replace(/[<>]/g, '').trim().slice(0, 16)
    window.setTimeout(() => {
      options.onPlay({
        hero: HEROES[heroIndex].id,
        pet: petId,
        look: { ...look },
        name
      })
    }, 700)
  })

  function fillChoices(selector, values, current, onPick, render) {
    const box = root.querySelector(selector)
    box.innerHTML = values.map((value) => {
      if (render) return render(value)
      const [id, label] = value
      return '<button type="button" data-value="' + id + '">' + label + '</button>'
    }).join('')
    mark(box, current)
    box.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
      onPick(btn.dataset.value && btn.dataset.value.match(/^\d+$/) ? Number(btn.dataset.value) : btn.dataset.value)
      mark(box, btn.dataset.value)
    }))
  }
  function mark(box, current) {
    box.querySelectorAll('button').forEach((btn) => btn.classList.toggle('on', String(btn.dataset.value) === String(current)))
  }

  return function destroy() {
    alive = false
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    stopMusic()
    scene.environment?.dispose?.()
    pmrem.dispose()
    composer?.dispose()
    renderer.dispose()
  }
}

function buildWorld(scene, high) {
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.25, metalness: 0.15 })
  )
  sea.rotation.x = -Math.PI / 2
  sea.receiveShadow = true
  scene.add(sea)
  const islands = [[-6, -4, 2.4], [5, 3, 1.8], [-2, 6, 1.4], [7, -6, 2]]
  islands.forEach(([x, z, scale], index) => {
    const island = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 12),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0x65a30d : 0x166534, roughness: 0.8 })
    )
    island.scale.set(scale, 0.45, scale)
    island.position.set(x, 0.2, z)
    island.castShadow = high
    island.receiveShadow = true
    scene.add(island)
    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 })
    )
    tree.position.set(x, 1.1, z)
    tree.castShadow = high
    scene.add(tree)
  })
  const bugs = new Float32Array(80 * 3)
  for (let i = 0; i < bugs.length; i += 3) {
    bugs[i] = (Math.random() - 0.5) * 24
    bugs[i + 1] = 1 + Math.random() * 6
    bugs[i + 2] = (Math.random() - 0.5) * 16
  }
  const points = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(bugs, 3)),
    new THREE.PointsMaterial({ color: 0xfef08a, size: 0.08 })
  )
  scene.add(points)
  const cloudGeo = new THREE.SphereGeometry(0.6, 10, 8)
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9, transparent: true, opacity: 0.85 })
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat)
    cloud.position.set(-10 + i * 4, 6 + (i % 2), -6)
    cloud.scale.set(2.2, 0.6, 1)
    scene.add(cloud)
  }
}

function makeConfetti() {
  const positions = new Float32Array(40 * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xf472b6, size: 0.12 }))
  points.userData.life = 0
  return points
}

function dropMaterials(mesh) {
  mesh.traverse((node) => {
    if (!node.material) return
    const list = Array.isArray(node.material) ? node.material : [node.material]
    list.forEach((material) => material.dispose())
  })
}

function hex(color) {
  return '#' + color.toString(16).padStart(6, '0')
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
}
