/* Четыре хранителя и три питомца. Рисунки только для глобуса:
   внутри миров герои другие. */
export const HEROES = [
  {
    id: 'sol',
    name: 'Сол',
    trait: 'Щит',
    bonus: 'shield',
    line: 'Держит удар и не бросает друзей.'
  },
  {
    id: 'rys',
    name: 'Рысь',
    trait: 'Рывок',
    bonus: 'speed',
    line: 'Быстрая, говорит коротко и по делу.'
  },
  {
    id: 'misha',
    name: 'Миша',
    trait: 'Запас сил',
    bonus: 'hp',
    line: 'Медлительный, зато его трудно сбить.'
  },
  {
    id: 'chizh',
    name: 'Чиж',
    trait: 'Прыжок',
    bonus: 'jump',
    line: 'Любит высоту и громко свистит.'
  }
]

export const PETS = [
  { id: 'firefly', name: 'Светлячок', line: 'Подсвечивает тропинку.' },
  { id: 'owl', name: 'Совёнок', line: 'Шепчет, если рядом тайна.' },
  { id: 'hedge', name: 'Ёжик', line: 'Тащит кристалл в сумке.' }
]

const SKIN = {
  sol: ['#fde68a', '#f59e0b', '#7c2d12'],
  rys: ['#fecdd3', '#e11d48', '#4c0519'],
  misha: ['#fed7aa', '#c2410c', '#431407'],
  chizh: ['#bfdbfe', '#2563eb', '#172554']
}

export function heroSvg(id) {
  const [a, b, c] = SKIN[id] || SKIN.sol
  const ears = id === 'rys'
    ? '<path d="M22 28 30 8l10 18" fill="' + b + '"/><path d="M70 28 78 8l10 18" fill="' + b + '"/>'
    : id === 'chizh'
      ? '<path d="M18 40 8 18l20 8" fill="' + b + '"/><path d="M82 40 112 18 90 48" fill="' + b + '"/>'
      : id === 'misha'
        ? '<circle cx="28" cy="30" r="12" fill="' + b + '"/><circle cx="84" cy="30" r="12" fill="' + b + '"/>'
        : '<circle cx="56" cy="22" r="10" fill="' + b + '"/>'
  return '<svg viewBox="0 0 120 120" aria-hidden="true">' +
    ears +
    '<circle cx="60" cy="62" r="34" fill="' + a + '" stroke="' + c + '" stroke-width="3"/>' +
    '<circle cx="48" cy="58" r="5" fill="' + c + '"/>' +
    '<circle cx="72" cy="58" r="5" fill="' + c + '"/>' +
    '<path d="M50 74c6 8 14 8 20 0" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="40" cy="68" r="4" fill="#fb7185" opacity="0.8"/>' +
    '<circle cx="80" cy="68" r="4" fill="#fb7185" opacity="0.8"/>' +
    '</svg>'
}

export function petSvg(id) {
  if (id === 'owl') {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="36" rx="18" ry="16" fill="#e9d5ff"/><circle cx="24" cy="34" r="7" fill="#fff"/><circle cx="40" cy="34" r="7" fill="#fff"/><circle cx="24" cy="34" r="3" fill="#312e81"/><circle cx="40" cy="34" r="3" fill="#312e81"/><path d="M32 38 l-4 6 h8z" fill="#f59e0b"/></svg>'
  }
  if (id === 'hedge') {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 36 18 16l8 14 8-18 8 18 8-14 8 20v10H10z" fill="#a16207"/><circle cx="32" cy="40" r="10" fill="#fde68a"/><circle cx="28" cy="38" r="2" fill="#451a03"/><circle cx="36" cy="38" r="2" fill="#451a03"/></svg>'
  }
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="34" rx="8" ry="14" fill="#facc15"/><circle cx="32" cy="22" r="6" fill="#fef9c3"/><circle cx="30" cy="21" r="1.4" fill="#422006"/><path d="M32 40 v12" stroke="#f59e0b" stroke-width="2"/></svg>'
}
