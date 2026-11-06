/* Карточки открытий собираются из учебной карты,
   чтобы альбом и миры говорили одно и то же. */
import { allItems } from './data/curriculum.js'

export const CARDS = Object.fromEntries(allItems().map((entry) => [entry.id, {
  title: entry.title,
  text: entry.text,
  wonder: entry.wonder,
  world: entry.world
}]))

export function cardById(id) {
  return CARDS[id] || null
}
