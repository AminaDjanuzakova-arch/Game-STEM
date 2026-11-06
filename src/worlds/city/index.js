/* Безопасный город: улица, страж и три большие кнопки поступка.
   1 — дорога, 2 — дом и люди, 3 — король опасностей. */
import { audioContext, beep, loop } from '../../audio.js'
import { mountGame } from '../../engine/game.js'
import { dress, makeBuddy, tickBuddy, house, mesh, geo, mat } from '../../engine/kit.js'
import { itemsForLevel } from '../../learn.js'

const LEVELS = [
  [
    { fact: 'road-zebra', text: 'Машины закрывают обзор. Где перейти?', correct: 'zebra',
      actions: [['zebra', 'Дойти до зебры'], ['gap', 'Между машинами'], ['run', 'Перебежать']] },
    { fact: 'road-light', text: 'На светофоре красный. Телефон звонит.', correct: 'wait',
      actions: [['wait', 'Ждать зелёный'], ['go', 'Идти сразу'], ['phone', 'Смотреть в телефон']] },
    { fact: 'road-bus', text: 'Автобус ещё едет к остановке.', correct: 'stop',
      actions: [['stop', 'Ждать на остановке'], ['front', 'Бежать перед ним'], ['chase', 'Догонять']] },
    { fact: 'home-safe', text: 'Дома на полу нож у розетки.', correct: 'adult',
      actions: [['adult', 'Позвать взрослого'], ['knife', 'Взять нож'], ['plug', 'Тронуть розетку']] }
  ],
  [
    { fact: 'home-fire', text: 'В коридоре дым.', correct: 'out',
      actions: [['out', 'Выйти и звонить 112'], ['hide', 'Спрятаться'], ['look', 'Идти к огню']] },
    { fact: 'home-balcony', text: 'Мяч улетел за перила.', correct: 'call',
      actions: [['call', 'Позвать взрослого'], ['lean', 'Перегнуться'], ['throw', 'Бросить вниз']] },
    { fact: 'net-safe', text: 'Чужое письмо: «Это мама, открой ссылку».', correct: 'show',
      actions: [['show', 'Показать взрослым'], ['open', 'Открыть ссылку'], ['send', 'Отправить адрес']] },
    { fact: 'city-stranger', text: 'Незнакомец зовёт за конфетой.', correct: 'stay',
      actions: [['stay', 'Остаться со своими'], ['go', 'Пойти за ним'], ['take', 'Взять конфету']] }
  ],
  [
    { fact: 'city-ice', text: 'Король зовёт на тёмный лёд.', correct: 'shore',
      actions: [['shore', 'Остаться на берегу'], ['step', 'Проверить ногой'], ['run', 'Пробежать']] },
    { fact: 'city-aid', text: 'Кто-то поранился, в ране осколок.', correct: 'help',
      actions: [['help', 'Звать взрослых и 112'], ['pull', 'Вытащить осколок'], ['run', 'Убежать']] },
    { fact: 'city-bike', text: 'Король толкает на дорогу без шлема.', correct: 'helm',
      actions: [['helm', 'Надеть шлем'], ['road', 'Выехать к машинам'], ['ears', 'Надеть наушники']] },
    { fact: 'city-boss', text: 'Король кричит открыть ссылку.', correct: 'close',
      actions: [['close', 'Закрыть и сказать взрослым'], ['open', 'Открыть'], ['pass', 'Написать пароль']] }
  ]
]

export function mount(root, hub) {
  audioContext()
  const stop = loop(280, (tick) => beep([262, 330, 392, 494][tick % 4], 0.14, 'square', 0.03))
  const game = mountGame(root, hub, spec(hub.level || 1))
  return { destroy() { stop(); game.destroy() } }
}

function spec(level) {
  const beats = LEVELS[Math.min(2, level - 1)]
  return {
    id: 'city',
    winTitle: level >= 3 ? 'Король отступил' : 'Улица спокойна',
    loseTitle: 'Смена не сдаётся',
    winText: 'Ты выбирал безопасный шаг.',
    loseText: 'Сердца кончились. Правила на месте.',
    howto: [
      'Смотри, что случилось на улице.',
      'Нажми один из трёх поступков.',
      'Верный шаг двигает стража вперёд.'
    ],
    stage: { sky: 0x7dd3fc, fog: 0xbae6fd, cam: [0, 3.4, 7.5] },
    create(api) {
      dress(api.world, 'city')
      const hero = makeBuddy('guard', 0xf97316)
      hero.position.set(-1.6, 0, 1)
      const dog = makeBuddy('fox', 0xfde68a)
      dog.scale.setScalar(0.55)
      dog.position.set(-2.3, 0, 1.3)
      const car = mesh(geo('car-body', () => new THREE.BoxGeometry(1.4, 0.45, 0.7)), mat(0xef4444), 2.4, 0.35, 1.4)
      car.add(mesh(geo('wheel', () => new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10)), mat(0x111827), 0.4, -0.2, 0.3))
      api.world.add(hero, dog, car, house(-4, -2, 0xfecaca))
      const state = { hero, dog, car, beats, index: 0, hearts: 3, mood: 'idle' }
      show(state, api)
      return state
    },
    decorate(state, api) {
      tickBuddy(state.hero, api.time, state.mood)
      tickBuddy(state.dog, api.time, 'idle')
      state.car.position.x = 2.2 + Math.sin(api.time * 0.7) * 0.4
    },
    action(state, id, api) {
      const beat = state.beats[state.index]
      if (!beat || id !== beat.correct) {
        state.hearts -= 1
        state.mood = 'scared'
        api.fault(beat.fact)
        api.say('Этот шаг опасен. Выбери другой.')
        api.setProgress(state.index / state.beats.length)
        if (state.hearts <= 0) api.lose('Сердца кончились. Попробуй ещё раз.')
        return
      }
      state.mood = 'happy'
      api.award(beat.fact)
      const extra = itemsForLevel('city', api.level)[state.index]
      if (extra && extra.id !== beat.fact) api.award(extra.id)
      beep(520, 0.08, 'triangle', 0.04)
      state.index += 1
      api.setProgress(state.index / state.beats.length)
      if (state.index >= state.beats.length) api.win()
      else show(state, api)
    }
  }
}

function show(state, api) {
  const beat = state.beats[state.index]
  api.mark(beat.correct)
  api.setGoal('Шаг ' + (state.index + 1) + ' из ' + state.beats.length + ': выбери безопасное')
  api.setActions(beat.actions.map(([id, label]) => ({ id, label, color: id === beat.correct && api.level === 1 && state.index === 0 ? '#86efac' : '#fff' })), api.level === 1 && state.index === 0 ? beat.correct : '')
  api.say(beat.text)
}

import * as THREE from 'three'
