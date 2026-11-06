/* Освоение: где ошибались, что уже открыто, звёзды знаний.
   Игровые звёзды мира живут отдельно, в save.worlds. */
import { itemsOf, worldOf } from './data/curriculum.js'

export function masteryOf(worldId, data) {
  const items = itemsOf(worldId)
  const seen = items.filter((entry) => data.cards.includes(entry.id) || data.mastery?.[entry.id]?.ok)
  const weak = items.filter((entry) => {
    const row = data.mastery?.[entry.id]
    return row && row.bad > row.ok
  })
  const percent = items.length ? Math.round((seen.length / items.length) * 100) : 0
  const stars = percent >= 85 ? 3 : percent >= 55 ? 2 : percent >= 25 ? 1 : 0
  return { percent, stars, seen, weak, items }
}

export function topicBars(worldId, data) {
  const world = worldOf(worldId)
  if (!world) return []
  return world.topics.map((topic) => {
    const list = world.items.filter((entry) => entry.topic === topic.id)
    const got = list.filter((entry) => data.cards.includes(entry.id)).length
    return {
      title: topic.title,
      percent: list.length ? Math.round((got / list.length) * 100) : 0
    }
  })
}

export function praise(worldId, data) {
  const known = itemsOf(worldId).filter((entry) => data.cards.includes(entry.id))
  const last = known[known.length - 1]
  if (!last) return 'Ты сделал шаг в этом мире.'
  return 'Ты теперь знаешь: ' + last.title + '!'
}

/* Слабые знания ставим раньше, чтобы они возвращались чаще. */
export function orderByWeak(list, data, getId) {
  return list.slice().sort((a, b) => score(data, getId(b)) - score(data, getId(a)))
}

function score(data, id) {
  const row = data.mastery?.[id]
  if (!row) return 0
  return row.bad * 2 - row.ok
}

export function weakestWorld(data, worldIds) {
  let pick = worldIds[0]
  let best = -1
  worldIds.forEach((id) => {
    const stats = masteryOf(id, data)
    const weight = stats.weak.length * 3 + (100 - stats.percent)
    if (weight > best) {
      best = weight
      pick = id
    }
  })
  return pick
}
