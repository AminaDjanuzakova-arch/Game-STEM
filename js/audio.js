/* Звуки и тихая музыка собираются в Web Audio API, без файлов.
   Ошибка звуковой карты не должна останавливать игру. */
(function (PG) {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;
  const melody = [262, 330, 392, 330, 294, 370, 330, 262, 392, 494, 392, 330];

  function context() {
    if (muted) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function tone(freq, when, dur, volume, type) {
    const audio = context();
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  function play(name) {
    const audio = context();
    if (!audio) return;
    const now = audio.currentTime + 0.01;
    if (name === 'tap') tone(520, now, 0.08, 0.04, 'sine');
    if (name === 'ok') {
      tone(523, now, 0.12, 0.05, 'sine');
      tone(659, now + 0.08, 0.12, 0.05, 'sine');
      tone(784, now + 0.16, 0.18, 0.05, 'sine');
    }
    if (name === 'bad') {
      tone(392, now, 0.12, 0.03, 'sine');
      tone(311, now + 0.1, 0.16, 0.03, 'sine');
    }
    if (name === 'star') {
      [523, 659, 784, 1047].forEach(function (freq, index) {
        tone(freq, now + index * 0.07, 0.2, 0.05, 'triangle');
      });
    }
    if (name === 'fanfare') {
      [392, 523, 659, 784, 1047].forEach(function (freq, index) {
        tone(freq, now + index * 0.09, 0.28, 0.06, 'triangle');
      });
    }
  }

  function loop() {
    if (muted || !musicTimer) return;
    const audio = context();
    if (audio) tone(melody[step % melody.length], audio.currentTime, 0.28, 0.018, 'triangle');
    step += 1;
    musicTimer = setTimeout(loop, 460);
  }

  PG.audio = {
    load(soundOn) {
      muted = soundOn === false;
    },
    isOn() { return !muted; },
    setMuted(next) {
      muted = !!next;
      if (muted) this.stopMusic();
      else this.startMusic();
    },
    toggle() {
      this.setMuted(!muted);
      return !muted;
    },
    play: play,
    startMusic() {
      if (muted || musicTimer) return;
      if (!context()) return;
      musicTimer = setTimeout(loop, 200);
    },
    stopMusic() {
      if (musicTimer) clearTimeout(musicTimer);
      musicTimer = null;
    }
  };
})(window.PG = window.PG || {});
