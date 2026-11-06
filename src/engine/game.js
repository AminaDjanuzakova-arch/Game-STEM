/* Оболочка одной 3D-игры: цель, «как играть», пауза и цикл.
   Правила остаются в файле мира. */
import * as THREE from 'three'
import { createStage, disposeObject } from './kit.js'
import { mountChrome, endMarkup, bindEnd, requestExit, award, fault, mentor } from '../shell/shell.js'
import { isMuted, toggleMute } from '../audio.js'
import './frame.css'

export function mountGame(root, hub, spec) {
  const level = hub.level || 1
  root.innerHTML =
    '<section class="play play-' + spec.id + '">' +
    '<header class="play-top"><div class="goal"><b data-goal></b><div class="goal-bar"><i data-bar></i></div></div>' +
    '<button type="button" class="play-help" data-help>?</button></header>' +
    '<div class="play-stage"><canvas data-view></canvas><p class="mentor-line" data-line hidden></p></div>' +
    '<footer class="play-actions" data-actions></footer>' +
    '<div class="howto"><div><h2>Как играть</h2><ol>' +
    spec.howto.map((step) => '<li>' + step + '</li>').join('') +
    '</ol><button type="button" data-go>Понятно!</button></div></div>' +
    '<div class="play-end" hidden></div></section>'
  const host = root.querySelector('.play')
  const canvas = host.querySelector('[data-view]')
  const stage = createStage(canvas, spec.stage || {})
  const world = new THREE.Group()
  stage.scene.add(world)
  let paused = false
  let ready = false
  let over = ''
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, down: false }
  const ray = new THREE.Raycaster()
  const api = {
    level,
    stage,
    world,
    pointer,
    time: 0,
    misses: 0,
    setGoal(text) { host.querySelector('[data-goal]').textContent = text },
    setProgress(value) { host.querySelector('[data-bar]').style.width = Math.max(0, Math.min(1, value)) * 100 + '%' },
    say(text) { mentor(host, text) },
    award(id) { award(host, hub, id) },
    fault(id) { api.misses += 1; fault(host, hub, id) },
    oops(text) { api.misses += 1; mentor(host, text) },
    setActions(list, pulseId) {
      host.querySelector('[data-actions]').innerHTML = list.map((item) =>
        '<button type="button" data-act="' + item.id + '" class="' + (item.id === pulseId ? 'pulse' : '') +
        '" style="background:' + (item.color || '#fff') + '">' + item.label + '</button>'
      ).join('')
    },
    mark(id) { host.dataset.need = id || '' },
    win() { finish(true) },
    lose(text) { finish(false, text) },
    pick() {
      ray.setFromCamera(new THREE.Vector2(pointer.nx, pointer.ny), stage.camera)
      return ray.intersectObjects(world.children, true)
    }
  }
  let state = null
  function boot() {
    clear(world)
    state = spec.create(api) || {}
    host.dataset.ready = ready ? '1' : '0'
  }
  function finish(victory, text) {
    if (over) return
    over = victory ? 'win' : 'lose'
    const stars = api.misses <= 1 ? 3 : api.misses <= 3 ? 2 : 1
    const end = host.querySelector('.play-end')
    end.hidden = false
    end.dataset.worldResult = over
    end.innerHTML = endMarkup(
      victory ? spec.winTitle : spec.loseTitle,
      victory ? spec.winText + ' Звёзды: ' + stars + '.' : (text || spec.loseText),
      victory,
      level
    )
    bindEnd(end, hub, { win: victory, stars: victory ? stars : 0, retry: () => reset() })
  }
  function reset() {
    over = ''
    api.misses = 0
    api.time = 0
    const end = host.querySelector('.play-end')
    end.hidden = true
    delete end.dataset.worldResult
    boot()
  }
  const chrome = mountChrome(host, {
    pause: () => { paused = true },
    resume: () => { paused = false },
    retry: reset,
    exit: () => requestExit(host, hub),
    muted: isMuted,
    toggleSound: toggleMute
  })
  host.querySelector('[data-help]').addEventListener('click', () => { host.querySelector('.howto').hidden = false })
  host.querySelector('[data-go]').addEventListener('click', () => {
    host.querySelector('.howto').hidden = true
    ready = true
    host.dataset.ready = '1'
    if (spec.onReady) spec.onReady(api, state)
  })
  host.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-act]')
    if (!btn || !ready || over || paused) return
    if (spec.action) spec.action(state, btn.dataset.act, api)
  })
  canvas.addEventListener('pointerdown', (event) => track(event, true))
  canvas.addEventListener('pointermove', (event) => track(event, pointer.down || event.buttons > 0))
  window.addEventListener('pointerup', up)
  function up() { pointer.down = false }
  function track(event, down) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = event.clientX - rect.left
    pointer.y = event.clientY - rect.top
    pointer.nx = (pointer.x / Math.max(rect.width, 1)) * 2 - 1
    pointer.ny = -((pointer.y / Math.max(rect.height, 1)) * 2 - 1)
    pointer.down = down
    if (ready && !over && spec.pointer) spec.pointer(state, api)
  }
  boot()
  let frame = 0
  let last = performance.now()
  let alive = true
  function tick(now) {
    if (!alive) return
    frame = requestAnimationFrame(tick)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    stage.resize()
    if (ready && !paused && !over && spec.update) spec.update(state, dt, api)
    api.time += dt
    if (spec.decorate) spec.decorate(state, api)
    stage.render()
    window.__guardian = { world: spec.id, over, ready, need: host.dataset.need || '', level }
  }
  frame = requestAnimationFrame(tick)
  const onResize = () => stage.resize()
  window.addEventListener('resize', onResize)
  return {
    destroy() {
      alive = false
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerup', up)
      chrome.destroy()
      clear(world)
      stage.dispose()
      delete window.__guardian
    }
  }
}

function clear(group) {
  while (group.children.length) {
    const child = group.children[0]
    group.remove(child)
    disposeObject(child)
  }
}
