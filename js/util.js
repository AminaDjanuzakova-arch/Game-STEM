/* Общие помощники. Игра без сборщика: все файлы подключаются обычными скриптами
   и складывают функции в объект window.PG, чтобы index.html открывался двойным щелчком. */
(function (PG) {
  PG.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  PG.escape = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };

  PG.cleanName = function (value) {
    return String(value || '')
      .replace(/[^\p{L}\p{N} -]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16);
  };

  PG.shuffle = function (list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  };

  PG.starsFor = function (mistakes, assists) {
    let stars = mistakes <= 1 ? 3 : mistakes <= 5 ? 2 : 1;
    if (assists > 0 && stars === 3) stars = 2;
    return stars;
  };

PG.starText = function (count) {
  const n = Math.max(0, Math.min(3, count || 0));
  return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
};

PG.starHtml = function (count) {
  const n = Math.max(0, Math.min(3, count || 0));
  return '<span class="star-on">' + '★'.repeat(n) + '</span><span class="star-off">' + '☆'.repeat(3 - n) + '</span>';
};

  PG.createScope = function () {
    const jobs = [];
    return {
      add(fn) { jobs.push(fn); },
      listen(el, type, fn, options) {
        el.addEventListener(type, fn, options);
        jobs.push(function () { el.removeEventListener(type, fn, options); });
      },
      later(fn, ms) {
        const id = setTimeout(fn, ms);
        jobs.push(function () { clearTimeout(id); });
        return id;
      },
      frame(fn) {
        let alive = true;
        function loop(time) {
          if (!alive) return;
          fn(time);
          requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
        jobs.push(function () { alive = false; });
      },
      destroy() {
        const copy = jobs.splice(0);
        copy.forEach(function (fn) {
          try { fn(); } catch (err) { console.error(err); }
        });
      }
    };
  };

  /* Считает ошибки по одной карточке и после второй мягко подсвечивает верную зону. */
  PG.trackFails = function (api, root) {
    const counts = Object.create(null);
    return function (key, selector) {
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] >= 2 && selector) {
        const zone = root.querySelector(selector);
        if (zone) {
          root.querySelectorAll('.hint-pulse').forEach(function (node) {
            node.classList.remove('hint-pulse');
          });
          zone.classList.add('hint-pulse');
          api.assist();
        }
      }
    };
  };

  PG.piece = function (item, extraClass) {
    return (
      '<div class="piece ' + (extraClass || '') + '" data-id="' + PG.escape(item.id) +
      '" role="button" tabindex="0">' +
      '<span class="piece-emoji">' + item.emoji + '</span>' +
      '<span class="piece-name">' + PG.escape(item.name) + '</span>' +
      '</div>'
    );
  };

  PG.shake = function (el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };
})(window.PG = window.PG || {});
