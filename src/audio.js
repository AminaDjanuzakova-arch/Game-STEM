/* Общий динамик: кнопка «звук» одна на все миры.
   Мелодии живут внутри миров и сюда не складываются. */
let ctx = null
let muted = localStorage.getItem('pg-arcade-muted') === '1'
let hold = false

export function setHold(next) {
  hold = !!next
}

export function isMuted() {
  return muted
}

export function audioContext() {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  if (!muted && ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function toggleMute() {
  muted = !muted
  localStorage.setItem('pg-arcade-muted', muted ? '1' : '0')
  if (ctx) {
    if (muted) ctx.suspend().catch(() => {})
    else ctx.resume().catch(() => {})
  }
  return muted
}

export function beep(freq, duration, type, gainValue, delay) {
  if (muted || hold) return
  try {
  const context = audioContext()
  if (context.state === 'closed') return
  const start = context.currentTime + (delay || 0)
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type || 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(gainValue ?? 0.06, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(context.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
  } catch (err) { /* звук не должен ронять игру */ }
}

/* Короткий цикл. step(tick) сам выбирает ноты. stop() обязателен при выходе. */
export function loop(intervalMs, step) {
  let tick = 0
  let timer = 0
  const id = window.setInterval(() => {
    if (muted || hold) return
    step(tick)
    tick += 1
  }, intervalMs)
  timer = id
  return function stop() {
    window.clearInterval(timer)
  }
}
