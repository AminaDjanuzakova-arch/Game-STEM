/* Космический гонщик: 3D-тоннель на Three.js.
   Корабль держит курс за пальцем. Планеты — трофеи, астероиды — урон.
   Босс — чёрная дыра: собери 3 маяка и не ныряй в ядро. */
import * as THREE from 'three'
import gsap from 'gsap'
import { audioContext, beep, isMuted, loop, toggleMute } from '../../audio.js'
import { cardById } from '../../rewards.js'
import './style.css'

const PLANETS = [
  { id: 'mercury', name: 'Меркурий', color: 0xb8b8b8 },
  { id: 'venus', name: 'Венера', color: 0xf59e0b },
  { id: 'earth', name: 'Земля', color: 0x38bdf8 },
  { id: 'mars', name: 'Марс', color: 0xf43f5e },
  { id: 'jupiter', name: 'Юпитер', color: 0xfbbf24 },
  { id: 'saturn', name: 'Сатурн', color: 0xfcd34d, ring: true },
  { id: 'uranus', name: 'Уран', color: 0x67e8f9 },
  { id: 'neptune', name: 'Нептун', color: 0x2563eb }
]

function buildCourse() {
  const list = []
  let z = 36
  const order = PLANETS.slice().sort(() => Math.random() - 0.5)
  order.forEach((planet, index) => {
    for (let i = 0; i < 3; i += 1) {
      const side = (i + index) % 2 === 0 ? -1 : 1
      list.push({
        kind: 'rock',
        z,
        x: side * (2.6 + (i % 2)),
        y: (i - 1) * 1.3,
        r: 0.55
      })
      z += 14
    }
    list.push({
      kind: 'planet',
      z: z + 8,
      x: Math.sin(index) * 1.1,
      y: Math.cos(index) * 0.6,
      r: 0.85,
      id: planet.id,
      name: planet.name,
      color: planet.color,
      ring: planet.ring
    })
    z += 30
  })
  list.push({ kind: 'boss-gate', z: z + 10, x: 0, y: 0, r: 1 })
  return { list, bossAt: z + 10 }
}

export function mount(root, hub) {
  audioContext()
  const stopMusic = loop(180, (tick) => {
    const scale = [220, 261, 329, 392, 329, 261]
    beep(scale[tick % scale.length], 0.12, 'sawtooth', 0.03)
    if (tick % 4 === 0) beep(110, 0.16, 'square', 0.03)
  })
  root.innerHTML =
    '<section class="world-space" data-ready="0">' +
    '<header class="space-top"><svg class="space-portrait" viewBox="0 0 64 64" aria-hidden="true">' +
    '<circle cx="32" cy="34" r="16" fill="#fde68a"/><path d="M16 30 22 12l10 14" fill="#f59e0b"/>' +
    '<path d="M48 30 42 12 32 26" fill="#f59e0b"/><circle cx="26" cy="32" r="2" fill="#111"/>' +
    '<circle cx="38" cy="32" r="2" fill="#111"/><path d="M28 40h8" stroke="#111" stroke-width="2"/>' +
    '<path d="M20 18h24v10H20z" fill="#22d3ee" opacity="0.7"/></svg>' +
    '<div><h1>Космический гонщик</h1><p class="space-speech">Котёнок Пилот держит штурвал.</p></div>' +
    '<div class="hp" data-hp></div><button type="button" class="space-mute" data-mute>' +
    (isMuted() ? 'Тихо' : 'Звук') + '</button></header>' +
    '<div class="space-stage"><canvas data-view></canvas>' +
    '<div class="space-splash"><div><h2>Гиперпрыжок</h2><p>Веди ракету пальцем. Планеты — трофеи, камни — пробоины.</p></div></div>' +
    '<div class="space-end" hidden></div></div>' +
    '<footer class="space-bottom"><p class="space-fact">Трофеи появятся на курсе.</p></footer></section>'

  const host = root.querySelector('.world-space')
  host.querySelector('[data-mute]').addEventListener('click', () => {
    toggleMute()
    host.querySelector('[data-mute]').textContent = isMuted() ? 'Тихо' : 'Звук'
  })

  const canvas = host.querySelector('[data-view]')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x07010f, 0.035)
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
  camera.position.set(0, 1.4, 8)
  scene.add(new THREE.AmbientLight(0x8899ff, 0.6))
  const key = new THREE.PointLight(0x22d3ee, 30, 40)
  scene.add(key)
  const pink = new THREE.PointLight(0xf472b6, 20, 30)
  pink.position.set(0, -2, -6)
  scene.add(pink)

  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPositions(), 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 })
  )
  scene.add(stars)

  const ship = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
  )
  hull.rotation.x = -Math.PI / 2
  const cabin = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0891b2, emissiveIntensity: 0.6, roughness: 0.2 })
  )
  cabin.position.set(0, 0.12, 0.1)
  ship.add(hull, cabin)
  scene.add(ship)

  const course = buildCourse()
  const meshes = course.list.map((item) => {
    let mesh
    if (item.kind === 'rock') {
      mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(item.r, 0),
        new THREE.MeshStandardMaterial({ color: 0x6b7280, flatShading: true })
      )
    } else if (item.kind === 'planet') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(item.r, 20, 16),
        new THREE.MeshStandardMaterial({ color: item.color, emissive: item.color, emissiveIntensity: 0.25, roughness: 0.4 })
      )
      if (item.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(item.r + 0.2, item.r + 0.55, 24),
          new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide })
        )
        ring.rotation.x = 1.1
        mesh.add(ring)
      }
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xf472b6 })
      )
    }
    mesh.position.set(item.x, item.y, -item.z)
    scene.add(mesh)
    item.mesh = mesh
    item.gone = false
    return item
  })

  const hole = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x020617 })
  )
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 2.3, 40),
    new THREE.MeshBasicMaterial({ color: 0xfb7185, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  )
  disk.rotation.x = 1.15
  hole.add(core, disk)
  hole.visible = false
  scene.add(hole)
  const beacons = [0, 1, 2].map((index) => {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.8 })
    )
    mesh.visible = false
    scene.add(mesh)
    return { mesh, got: false, angle: index * 2.1 }
  })

  const state = {
    progress: 0,
    x: 0,
    y: 0.4,
    tx: 0,
    ty: 0.4,
    hp: hub.hero.bonus === 'shield' ? 4 : 3,
    maxHp: hub.hero.bonus === 'shield' ? 4 : 3,
    hurt: 0,
    boss: false,
    beacons: 0,
    miss: 0,
    found: [],
    over: '',
    speed: hub.hero.bonus === 'speed' ? 24 : 18
  }

  function resize() {
    const width = canvas.clientWidth || 800
    const height = canvas.clientHeight || 450
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  function steer(event) {
    const rect = canvas.getBoundingClientRect()
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    state.tx = Math.max(-5, Math.min(5, nx * 5))
    state.ty = Math.max(-2.6, Math.min(3, ny * 2.6))
  }
  canvas.addEventListener('pointerdown', steer)
  canvas.addEventListener('pointermove', steer)

  let frame = 0
  let last = performance.now()
  let alive = true

  function tick(now) {
    if (!alive) return
    frame = requestAnimationFrame(tick)
    const dt = Math.min(0.033, (now - last) / 1000)
    last = now
    if (state.over) {
      renderer.render(scene, camera)
      return
    }
    state.hurt = Math.max(0, state.hurt - dt)
    const follow = 1 - Math.pow(0.001, dt)
    state.x += (state.tx - state.x) * follow
    state.y += (state.ty - state.y) * follow
    if (state.boss) {
      state.x += (0 - state.x) * dt * 0.35
      state.y += (0 - state.y) * dt * 0.35
      if (Math.hypot(state.x, state.y) < 1.15) hit()
      beacons.forEach((beacon) => {
        if (beacon.got) return
        beacon.angle += dt * 0.8
        const bx = Math.cos(beacon.angle) * 3.1
        const by = Math.sin(beacon.angle) * 1.6
        beacon.mesh.position.set(bx, by, -8)
        beacon.mesh.rotation.y += dt
        if (Math.hypot(state.x - bx, state.y - by) < 0.7) {
          beacon.got = true
          beacon.mesh.visible = false
          state.beacons += 1
          beep(880, 0.1, 'square', 0.05)
          if (state.beacons >= 3) win()
        }
      })
      hole.position.set(0, 0, -8)
      disk.rotation.z += dt
    } else {
      state.progress += state.speed * dt
      meshes.forEach((item) => {
        if (item.gone) return
        const rel = item.z - state.progress
        item.mesh.position.z = -rel
        item.mesh.rotation.y += dt
        if (item.kind === 'boss-gate' && rel < 6) startBoss()
        if (rel < 1.4 && rel > -1) {
          const dist = Math.hypot(state.x - item.x, state.y - item.y)
          if (item.kind === 'rock' && dist < item.r + 0.45) hit(item)
          if (item.kind === 'planet' && dist < item.r + 0.7) collect(item)
        }
        if (rel < -4) item.mesh.visible = false
      })
    }
    ship.position.set(state.x, state.y, 0)
    ship.rotation.z = (state.tx - state.x) * -0.4
    camera.position.x = state.x * 0.35
    camera.position.y = 1.3 + state.y * 0.2
    camera.lookAt(state.x, state.y, -12)
    key.position.set(state.x, state.y, 2)
    publish()
    renderer.render(scene, camera)
  }

  function hit(item) {
    if (state.hurt > 0 || state.over) return
    state.hurt = 0.9
    state.hp -= 1
    state.miss += 1
    beep(90, 0.18, 'sawtooth', 0.06)
    if (item) {
      item.gone = true
      item.mesh.visible = false
    }
    say('Пробоина! Уводи корабль в сторону.')
    if (state.hp <= 0) lose()
  }

  function collect(item) {
    item.gone = true
    item.mesh.visible = false
    state.found.push(item.name)
    hub.discover(item.id)
    const card = cardById(item.id)
    host.querySelector('.space-fact').textContent = item.name + '. ' + (card ? card.text : '')
    say('Трофей: ' + item.name)
    beep(660, 0.08, 'square', 0.04)
  }

  function startBoss() {
    if (state.boss) return
    state.boss = true
    hole.visible = true
    beacons.forEach((beacon) => { beacon.mesh.visible = true })
    meshes.forEach((item) => { item.mesh.visible = false })
    hub.discover('space-boss')
    say('Чёрная дыра! Держись у жёлтых маяков, не у центра.')
  }

  function starsCount() {
    if (state.miss <= 1) return 3
    if (state.miss <= 3) return 2
    return 1
  }

  function win() {
    state.over = 'win'
    openEnd('win', 'Курс проложен', 'Маяки собраны. Звёзды: ' + starsCount() + '. ' + state.found.join(', '), true)
  }
  function lose() {
    state.over = 'lose'
    openEnd('lose', 'Корабль на ремонте', 'Щиты сели. Трасса никуда не денется.', false)
  }
  function openEnd(kind, title, text, victory) {
    const end = host.querySelector('.space-end')
    end.hidden = false
    end.dataset.worldResult = kind
    end.innerHTML = '<div><h2>' + title + '</h2><p>' + text + '</p>' +
      (victory
        ? '<button type="button" data-world-exit>На глобус</button>'
        : '<button type="button" data-world-retry>Ещё заход</button>') + '</div>'
    gsap.from(end, { scale: 1.04, duration: 0.3 })
    const exit = end.querySelector('[data-world-exit]')
    if (exit) exit.addEventListener('click', () => hub.finish({ win: true, stars: starsCount() }))
    const retry = end.querySelector('[data-world-retry]')
    if (retry) retry.addEventListener('click', restart)
  }
  function restart() {
    state.progress = 0
    state.hp = state.maxHp
    state.hurt = 0
    state.boss = false
    state.beacons = 0
    state.miss = 0
    state.over = ''
    state.found = []
    state.x = 0
    state.y = 0.4
    meshes.forEach((item) => {
      item.gone = false
      item.mesh.visible = true
    })
    beacons.forEach((beacon) => {
      beacon.got = false
      beacon.mesh.visible = false
    })
    hole.visible = false
    host.querySelector('.space-end').hidden = true
    say('Новый заход. Держи центр, пока камни не заставят свернуть.')
  }

  function say(text) {
    host.querySelector('.space-speech').textContent = text
  }
  function publish() {
    const hp = host.querySelector('[data-hp]')
    hp.innerHTML = ''
    for (let i = 0; i < state.maxHp; i += 1) {
      const bit = document.createElement('i')
      if (i >= state.hp) bit.className = 'off'
      hp.appendChild(bit)
    }
    window.__guardian = {
      world: 'space',
      hp: state.hp,
      boss: state.boss,
      over: state.over,
      x: state.x,
      y: state.y,
      beacons: state.beacons,
      hazards: meshes.filter((item) => !item.gone && !state.boss).map((item) => ({
        kind: item.kind,
        x: item.x,
        y: item.y,
        rel: item.z - state.progress
      })).concat(state.boss ? beacons.filter((item) => !item.got).map((item) => ({
        kind: 'beacon',
        x: Math.cos(item.angle) * 3.1,
        y: Math.sin(item.angle) * 1.6,
        rel: 8
      })) : [])
    }
  }

  function starPositions() {
    const data = []
    for (let i = 0; i < 400; i += 1) {
      data.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, -Math.random() * 120)
    }
    return data
  }

  gsap.to(host.querySelector('.space-splash'), {
    opacity: 0, delay: 0.8, duration: 0.35,
    onComplete: () => {
      host.querySelector('.space-splash').hidden = true
      host.dataset.ready = '1'
      frame = requestAnimationFrame(tick)
    }
  })

  function destroy() {
    alive = false
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
    stopMusic()
    renderer.dispose()
    delete window.__guardian
  }
  return { destroy }
}
