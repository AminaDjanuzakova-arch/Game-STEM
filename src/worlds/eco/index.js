/* Эко-патруль: крупный мусор в центре, цветные баки внизу.
   Уровень 1 — бумага и пластик. 2 — все баки и зверёк. 3 — быстрый вихрь. */
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, bottle, paperSheet, glassJar, peel, battery, binMesh, label } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

const BINS = [
  { id: 'paper', title: 'Бумага', color: '#2563eb', hex: 0x2563eb },
  { id: 'plastic', title: 'Пластик', color: '#facc15', hex: 0xfacc15 },
  { id: 'glass', title: 'Стекло', color: '#16a34a', hex: 0x16a34a },
  { id: 'food', title: 'Еда', color: '#92400e', hex: 0x92400e },
  { id: 'hazard', title: 'Батарейки', color: '#dc2626', hex: 0xdc2626 }
]

const THINGS = {
  paper: { title: 'Газета', fact: 'eco-paper', build: paperSheet },
  plastic: { title: 'Бутылка', fact: 'eco-plastic', build: () => bottle(0x38bdf8) },
  glass: { title: 'Банка', fact: 'eco-glass', build: glassJar },
  food: { title: 'Кожура', fact: 'eco-food', build: peel },
  hazard: { title: 'Батарейка', fact: 'eco-hazard', build: battery },
  animal: { title: 'Птенец', fact: 'eco-animal', build: () => {
    const chick = makeBuddy('hare', 0xfde68a)
    chick.scale.setScalar(0.4)
    return chick
  } }
}

export function mount(root, hub) {
  audioContext()
  const stop = loop(170, (tick) => beep([523, 659, 784, 880][tick % 4], 0.08, 'square', 0.03))
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  return {
    id: 'eco',
    winTitle: 'Площадка чистая',
    loseTitle: 'Площадка замусорилась',
    winText: 'Баки не перепутаны.',
    loseText: 'Можно начать смену снова.',
    howto: [
      'Смотри, какой предмет в центре.',
      'Нажми бак того же цвета и слова.',
      'Птенца не бросай в мусор — жми «Спасти».'
    ],
    stage: { sky: 0x7dd3fc, fog: 0x93c5fd, fogNear: 10, fogFar: 28, cam: [0, 2.7, 5.8], look: [0, 0.7, 1.1], rim: 0xfde68a, bloomStrength: 0.12 },
    create(api) {
      dress(api.world, 'eco')
      const hero = makeBuddy('robot', 0xf472b6)
      hero.position.set(-2.2, 0, 1.2)
      api.world.add(hero)
      BINS.forEach((bin, index) => {
        const mesh = binMesh(bin.hex)
        mesh.position.set(-3.2 + index * 1.6, 0, 2.4)
        const tag = label(bin.title, bin.color)
        tag.position.set(0, 1.05, 0)
        mesh.add(tag)
        api.world.add(mesh)
      })
      const queue = deck(level)
      const state = { hero, queue, item: null, done: 0, need: queue.length, clean: 0.45, fuse: 0, mood: 'idle' }
      spawn(state, api)
      return state
    },
    update(state, dt, api) {
      if (!state.item) return
      state.fuse -= dt
      state.item.mesh.rotation.y += dt
      state.item.mesh.position.y = 1.15 + Math.sin(api.time * 3) * 0.08
      api.setProgress(state.done / state.need)
      if (state.fuse <= 0) {
        api.fault(state.item.fact)
        api.say('Время вышло. ' + state.item.title + ' снова в центре.')
        state.clean = Math.max(0, state.clean - 0.12)
        state.fuse = fuseTime(api.level)
        if (state.clean <= 0) api.lose('Площадка заполнилась. Начни смену ещё раз.')
      }
    },
    decorate(state, api) { tickBuddy(state.hero, api.time, state.mood) },
    action(state, id, api) {
      if (!state.item) return
      const ok = id === state.item.bin
      if (!ok) {
        api.fault(state.item.fact)
        api.say(state.item.bin === 'save' ? 'Птенца не кладут в бак.' : 'Это другой бак. Смотри на цвет.')
        state.clean = Math.max(0, state.clean - 0.08)
        state.mood = 'scared'
        if (api.level === 1) return
        if (state.clean <= 0) api.lose('Слишком много промахов.')
        return
      }
      api.award(state.item.fact)
      api.say(state.item.title + ' — в правильном месте.')
      state.mood = 'happy'
      beep(640, 0.06, 'triangle', 0.04)
      state.done += 1
      api.world.remove(state.item.mesh)
      state.item = null
      api.setProgress(state.done / state.need)
      if (state.done >= state.need) api.win()
      else spawn(state, api)
    }
  }
}

function deck(level) {
  const easy = ['paper', 'plastic', 'paper', 'plastic']
  const mid = ['paper', 'plastic', 'glass', 'food', 'hazard', 'animal']
  const hard = ['glass', 'hazard', 'plastic', 'animal', 'food', 'paper', 'hazard', 'glass']
  return (level >= 3 ? hard : level === 2 ? mid : easy).map((id) => ({
    bin: id === 'animal' ? 'save' : id,
    title: THINGS[id].title,
    fact: factFor(level, id),
    build: THINGS[id].build
  }))
}

function factFor(level, id) {
  const extra = itemsForLevel('eco', level).map((item) => item.id)
  if (id === 'paper' && extra.includes('eco-save')) return level === 1 ? 'eco-paper' : 'eco-save'
  if (id === 'food' && extra.includes('eco-cycle')) return 'eco-cycle'
  if (id === 'hazard' && extra.includes('eco-lamp')) return 'eco-lamp'
  return THINGS[id].fact
}

function spawn(state, api) {
  const next = state.queue[state.done]
  const mesh = next.build()
  mesh.position.set(0, 1.15, 0.6)
  mesh.scale.setScalar(1.7)
  api.world.add(mesh)
  state.item = { ...next, mesh }
  state.fuse = fuseTime(api.level)
  state.mood = 'wave'
  api.mark(next.bin)
  api.setGoal(next.bin === 'save' ? 'Спаси: ' + next.title : next.title + ' — в свой бак')
  const buttons = BINS.map((bin) => ({ id: bin.id, label: bin.title, color: bin.color }))
  if (next.bin === 'save' || api.level > 1) buttons.push({ id: 'save', label: 'Спасти', color: '#f9a8d4' })
  api.setActions(buttons, api.level === 1 ? next.bin : '')
  const lesson = itemsForLevel('eco', api.level)[0]
  if (state.done === 0 && lesson) api.say(lesson.mentor)
}

function fuseTime(level) {
  if (level >= 3) return 4.2
  if (level === 2) return 6
  return 9
}
