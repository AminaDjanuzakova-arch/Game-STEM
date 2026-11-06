/* Прогресс живёт только в localStorage этого браузера.
   Если хранилище недоступно, игра продолжается в памяти вкладки. */
(function (PG) {
  const KEY = 'planet-guardians-v1';
  let cache = null;

  function blank() {
    return { v: 1, name: '', sound: true, games: {}, cards: [], medals: [] };
  }

  function knownCard(id) {
    return !!(PG.content && PG.content.cards && PG.content.cards[id]);
  }

  function knownMedal(id) {
    return PG.content.medals.some(function (medal) { return medal.id === id; });
  }

  function normalize(raw) {
    const data = blank();
    if (!raw || typeof raw !== 'object') return data;
    data.name = PG.cleanName(raw.name);
    data.sound = raw.sound !== false;
    data.games = raw.games && typeof raw.games === 'object' ? raw.games : {};
    Object.keys(data.games).forEach(function (id) {
      const item = data.games[id] || {};
      data.games[id] = {
        stars: Math.max(0, Math.min(3, Number(item.stars) || 0)),
        done: !!item.done
      };
    });
    data.cards = Array.isArray(raw.cards) ? raw.cards.filter(knownCard) : [];
    data.medals = Array.isArray(raw.medals) ? raw.medals.filter(knownMedal) : [];
    return data;
  }

  function write(data) {
    cache = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* игра живёт и без диска */ }
  }

  PG.storage = {
    key: KEY,
    load() {
      if (cache) return cache;
      try {
        const raw = localStorage.getItem(KEY);
        cache = normalize(raw ? JSON.parse(raw) : null);
      } catch (err) {
        cache = blank();
      }
      return cache;
    },
    update(fn) {
      const data = this.load();
      fn(data);
      write(data);
      return data;
    },
    reset() {
      write(blank());
      return cache;
    }
  };
})(window.PG = window.PG || {});
