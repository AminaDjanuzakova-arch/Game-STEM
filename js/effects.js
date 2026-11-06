/* Короткие праздничные эффекты. Частицы сами удаляются и не копятся. */
(function (PG) {
  function burst(className, count) {
    if (PG.prefersReduced) return;
    const layer = document.getElementById('fx');
    if (!layer) return;
    const colors = ['#ffe56a', '#fb7185', '#34d399', '#60a5fa', '#c084fc', '#fff'];
    for (let i = 0; i < count; i += 1) {
      const bit = document.createElement('i');
      bit.className = className;
      bit.style.left = (className === 'spark' ? 50 : Math.random() * 100) + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.15) + 's';
      bit.style.setProperty('--dx', ((Math.random() * 2 - 1) * (className === 'spark' ? 120 : 0)) + 'px');
      layer.appendChild(bit);
      window.setTimeout(function () { bit.remove(); }, 1600);
    }
  }

  PG.effects = {
    confetti() { burst('confetti', 42); },
    sparkle() { burst('spark', 14); },
    clear() {
      const layer = document.getElementById('fx');
      if (layer) layer.replaceChildren();
    }
  };
})(window.PG = window.PG || {});
