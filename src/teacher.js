/* Настройки учителя и сертификат. Прогресс ученика живёт в save.js. */
const KEY = 'planet-guardians-teacher-v1'

export const DEFAULT_PRIZES = [
  'Пятёрка в журнал',
  'День без домашнего задания',
  'Похвала от учителя',
  'Выбери игру на уроке',
  'Сладкий сюрприз'
]

const WORLD_IDS = ['city', 'space', 'forest', 'body', 'russia', 'time', 'eco']

export function loadTeacher() {
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : {}
    return {
      prizes: Array.isArray(data.prizes) && data.prizes.length ? data.prizes.map(String) : DEFAULT_PRIZES.slice(),
      assign: data.assign && typeof data.assign === 'object' ? data.assign : {},
      students: Array.isArray(data.students) ? data.students : [],
      active: data.active || ''
    }
  } catch (err) {
    return { prizes: DEFAULT_PRIZES.slice(), assign: {}, students: [], active: '' }
  }
}

export function saveTeacher(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
  return data
}

export function activeStudent() {
  return loadTeacher().active || ''
}

export function prizeFor(worldId) {
  const teacher = loadTeacher()
  const choice = teacher.assign[worldId]
  if (typeof choice === 'number' && teacher.prizes[choice]) return teacher.prizes[choice]
  const index = Math.abs(hash(worldId + ':' + (activeStudent() || 'class'))) % teacher.prizes.length
  return teacher.prizes[index] || DEFAULT_PRIZES[0]
}

export function drawCertificate(info) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 760
  const ctx = canvas.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, 760)
  sky.addColorStop(0, '#1e1b4b')
  sky.addColorStop(1, '#0f766e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 1200, 760)
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 16
  ctx.strokeRect(36, 36, 1128, 688)
  ctx.fillStyle = '#fef3c7'
  ctx.font = '700 54px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Хранитель темы', 600, 180)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 64px sans-serif'
  ctx.fillText(info.world, 600, 280)
  ctx.font = '600 36px sans-serif'
  ctx.fillText(info.name || 'Ученик', 600, 380)
  ctx.fillStyle = '#fde68a'
  ctx.font = '700 40px sans-serif'
  ctx.fillText('Приз: ' + info.prize, 600, 470)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '500 28px sans-serif'
  ctx.fillText(info.date, 600, 560)
  ctx.fillText('Покажи карточку учителю', 600, 620)
  return canvas
}

export function downloadCertificate(info) {
  const canvas = drawCertificate(info)
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = 'sertifikat-hranitel.png'
  link.click()
}

export function worldIds() {
  return WORLD_IDS.slice()
}

function hash(text) {
  return text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}
