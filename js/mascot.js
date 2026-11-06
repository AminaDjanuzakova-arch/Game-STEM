/* Лучик — солнечный талисман. Настроение меняется классом на #mascot. */
(function (PG) {
  const FACE = [
    '<svg viewBox="0 0 128 128" class="mascot-svg" aria-hidden="true">',
    '<g class="rays">',
    '<polygon points="64,6 70,24 58,24"/>',
    '<polygon points="64,122 70,104 58,104"/>',
    '<polygon points="6,64 24,58 24,70"/>',
    '<polygon points="122,64 104,58 104,70"/>',
    '<polygon points="20,20 36,28 28,40"/>',
    '<polygon points="108,20 100,40 92,28"/>',
    '<polygon points="20,108 28,88 40,100"/>',
    '<polygon points="108,108 92,100 100,88"/>',
    '</g>',
    '<g class="bob">',
    '<path class="cape" d="M40 78 L28 112 L64 98 L100 112 L88 78 Z"/>',
    '<circle class="face" cx="64" cy="62" r="30"/>',
    '<g class="eyes">',
    '<ellipse class="eye" cx="53" cy="58" rx="6" ry="7"/>',
    '<ellipse class="eye" cx="75" cy="58" rx="6" ry="7"/>',
    '<circle class="pupil" cx="55" cy="60" r="2.4"/>',
    '<circle class="pupil" cx="77" cy="60" r="2.4"/>',
    '</g>',
    '<path class="smile" d="M50 70 Q64 82 78 70" fill="none" stroke="#c2410c" stroke-width="3" stroke-linecap="round"/>',
    '<circle class="cheek" cx="44" cy="68" r="4.5"/>',
    '<circle class="cheek" cx="84" cy="68" r="4.5"/>',
    '<g class="arm left"><line x1="36" y1="78" x2="22" y2="96" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/><circle cx="20" cy="98" r="5" fill="#fdba74"/></g>',
    '<g class="arm right"><line x1="92" y1="78" x2="108" y2="90" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/><circle cx="110" cy="92" r="5" fill="#fdba74"/></g>',
    '<ellipse class="boot" cx="50" cy="112" rx="10" ry="6"/>',
    '<ellipse class="boot" cx="78" cy="112" rx="10" ry="6"/>',
    '</g>',
    '</svg>'
  ].join('');

  PG.mascot = {
    mount(el) {
      el.innerHTML = FACE;
      el.classList.add('mood-idle');
    },
    mood(name) {
      const el = document.getElementById('mascot');
      if (!el) return;
      el.classList.remove('mood-idle', 'mood-happy', 'mood-oops', 'mood-cheer', 'mood-think');
      el.classList.add('mood-' + (name || 'idle'));
    },
    say(text, mood) {
      const bubble = document.getElementById('speech');
      if (bubble) bubble.textContent = text;
      this.mood(mood || 'idle');
    }
  };
})(window.PG = window.PG || {});
