/* Оболочка: карта, альбом, награды, карточки открытий и запуск мини-игр.
   Новая локация: запись в data/content.js, файл js/games/<id>.js и script в index.html. */
(function (PG) {
  const screenEl = document.getElementById('screen');
  const modal = document.getElementById('modal');
  const modalWindow = modal.querySelector('.modal-window');
  const backBtn = document.getElementById('btn-back');
  const titleEl = document.getElementById('top-heading');
  const subEl = document.getElementById('top-sub');
  const progressWrap = document.getElementById('top-progress');
  const progressBar = document.getElementById('top-bar');
  const progressCount = document.getElementById('top-count');
  const albumBtn = document.getElementById('btn-album');
  const medalsBtn = document.getElementById('btn-medals');
  const retryBtn = document.getElementById('btn-retry');
  const helpBtn = document.getElementById('btn-help');
  const soundBtn = document.getElementById('btn-sound');

  let mode = 'intro';
  let session = null;
  let modalResolver = null;

  function gameById(id) {
    return PG.content.games.find(function (game) { return game.id === id; });
  }

  function setTheme(theme) {
    const keep = document.body.className.replace(/theme-\S+/g, '').trim();
    document.body.className = (keep + ' theme-' + (theme || 'day')).trim();
  }

  function show(next) {
    mode = next;
    screenEl.classList.remove('enter');
    void screenEl.offsetWidth;
    screenEl.classList.add('enter');
  }

  function heroName() {
    return PG.storage.load().name;
  }

  function doneCount(state) {
    return PG.content.games.filter(function (game) {
      return state.games[game.id] && state.games[game.id].done;
    }).length;
  }

  function starCount(state) {
    return PG.content.games.reduce(function (sum, game) {
      return sum + ((state.games[game.id] && state.games[game.id].stars) || 0);
    }, 0);
  }

  function medalUnlocked(id, state) {
    const ids = PG.content.games.map(function (game) { return game.id; });
    const done = function (gid) { return !!(state.games[gid] && state.games[gid].done); };
    const stars = function (gid) { return (state.games[gid] && state.games[gid].stars) || 0; };
    if (id === 'first') return ids.some(done);
    if (id === 'collector') return state.cards.length >= 15;
    if (id === 'shining') return ids.some(function (gid) { return stars(gid) >= 3; });
    if (id === 'champion') return ids.every(done);
    if (id === 'fullsky') return ids.every(function (gid) { return stars(gid) >= 3; });
    if (ids.indexOf(id) >= 0) return done(id);
    return false;
  }

  function syncSoundButton() {
    const on = PG.audio.isOn();
    soundBtn.textContent = on ? 'Звук' : 'Тихо';
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
  }

  function chrome() {
    const state = PG.storage.load();
    const inGame = mode === 'game' && session;
    backBtn.hidden = mode === 'intro';
    backBtn.textContent = mode === 'map' ? 'Начало' : 'Карта';
    albumBtn.hidden = mode !== 'map';
    medalsBtn.hidden = mode !== 'map';
    retryBtn.hidden = !inGame;
    helpBtn.hidden = !inGame;
    progressWrap.hidden = !inGame;
    if (mode === 'intro') {
      titleEl.textContent = 'Хранители планеты';
      subEl.textContent = 'Окружающий мир · 4 класс';
    } else if (mode === 'map') {
      titleEl.textContent = 'Волшебная карта';
      subEl.textContent = 'Звёзды ' + starCount(state) + ' из ' + (PG.content.games.length * 3);
    } else if (mode === 'album') {
      titleEl.textContent = 'Альбом открытий';
      subEl.textContent = state.cards.length + ' из ' + Object.keys(PG.content.cards).length;
    } else if (mode === 'medals') {
      titleEl.textContent = 'Награды';
      subEl.textContent = state.medals.length + ' из ' + PG.content.medals.length;
    } else if (session) {
      titleEl.textContent = session.meta.title;
      subEl.textContent = session.meta.place;
    }
    albumBtn.textContent = 'Альбом (' + state.cards.length + ')';
  }

  function closeModal(result) {
    modal.hidden = true;
    modal.dataset.mode = '';
    modalWindow.innerHTML = '';
    if (modalResolver) {
      const resolve = modalResolver;
      modalResolver = null;
      resolve(result);
    }
  }

  function openModal(html, modalMode) {
    modal.hidden = false;
    modal.dataset.mode = modalMode || 'dismiss';
    modalWindow.innerHTML = html;
    const focus = modalWindow.querySelector('button, input');
    if (focus) focus.focus();
  }

  function confirmModal(text, okLabel, cancelLabel) {
    return new Promise(function (resolve) {
      modalResolver = resolve;
      openModal(
        '<h2>Минутку</h2><p>' + PG.escape(text) + '</p><div class="btn-row">' +
        '<button type="button" class="btn btn-ghost" data-no>' + PG.escape(cancelLabel || 'Оставить') + '</button>' +
        '<button type="button" class="btn" data-ok>' + PG.escape(okLabel || 'Да') + '</button></div>',
        'confirm'
      );
      modalWindow.querySelector('[data-ok]').onclick = function () { closeModal(true); };
      modalWindow.querySelector('[data-no]').onclick = function () { closeModal(false); };
    });
  }

  function showFact(card, kicker) {
    const body = document.getElementById('fact-body');
    if (!body) return;
    body.innerHTML =
      '<div class="fact-emoji">' + card.emoji + '</div>' +
      '<p class="kicker">' + PG.escape(kicker) + '</p>' +
      '<h3>' + PG.escape(card.title) + '</h3>' +
      '<p>' + PG.escape(card.text) + '</p>';
    body.classList.remove('pop');
    void body.offsetWidth;
    body.classList.add('pop');
  }

  function endSession() {
    if (session) session.scope.destroy();
    session = null;
    PG.effects.clear();
    document.body.classList.remove('is-dragging');
    document.querySelectorAll('.drag-ghost').forEach(function (ghost) { ghost.remove(); });
  }

  function showIntro() {
    endSession();
    setTheme('day');
    show('intro');
    const state = PG.storage.load();
    const back = doneCount(state) > 0;
    screenEl.dataset.screen = 'intro';
    screenEl.innerHTML =
      '<section class="intro"><div class="intro-card">' +
      '<p class="kicker">Окружающий мир · 4 класс</p>' +
      '<h1>Хранители планеты</h1>' +
      '<p>Планета позвала хранителей. Лучик — твой талисман: он подскажет, порадуется и не будет ругать за ошибку. На карте семь испытаний, и в каждом своя игра.</p>' +
      '<form id="start-form"><label>Как тебя зовут?<input id="hero-name" name="hero" maxlength="16" autocomplete="off" placeholder="Можно пропустить" value="' +
      PG.escape(state.name) + '"></label><button class="btn" type="submit">' +
      (back ? 'Продолжить путь' : 'В путь!') + '</button></form></div></section>';
    chrome();
    const nameBit = state.name ? state.name : '';
    PG.mascot.say(
      back
        ? 'С возвращением' + (nameBit ? ', ' + nameBit : '') + '! Звёзды на месте.'
        : 'Привет! Я Лучик. Ошибки здесь не страшные: попробуем ещё раз.',
      'happy'
    );
    screenEl.querySelector('#start-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const input = screenEl.querySelector('#hero-name');
      PG.storage.update(function (data) { data.name = PG.cleanName(input.value); });
      PG.audio.startMusic();
      showMap();
    });
  }

  function showMap() {
    endSession();
    setTheme('day');
    show('map');
    const state = PG.storage.load();
    const done = doneCount(state);
    const cards = PG.content.games.map(function (game, index) {
      const saved = state.games[game.id] || { stars: 0 };
      const span = index < 4 ? 'span-3' : 'span-4';
      return '<button type="button" class="loc ' + span + '" data-game="' + game.id + '">' +
        '<span class="loc-order">' + game.order + '</span>' +
        '<span class="loc-emoji">' + game.emoji + '</span>' +
        '<span class="loc-title">' + PG.escape(game.title) + '</span>' +
        '<span class="loc-place">' + PG.escape(game.place) + '</span>' +
        '<span class="stars" aria-label="' + (saved.stars || 0) + ' из 3 звёзд">' + PG.starHtml(saved.stars || 0) + '</span>' +
        '</button>';
    }).join('');
    const banner = done === PG.content.games.length
      ? '<div class="banner">Все семь мест пройдены. Ты хранитель планеты.</div>'
      : '';
    screenEl.dataset.screen = 'map';
    screenEl.innerHTML =
      '<div class="map-wrap"><div class="trip"><span>Путешествие: ' + done + ' из ' + PG.content.games.length +
      '</span><div class="bar"><div id="trip-fill" style="width:' + Math.round(done / PG.content.games.length * 100) +
      '%"></div></div></div>' + banner + '<div class="world-grid">' + cards + '</div>' +
      '<p class="note">Звёзды и альбом сохраняются на этом компьютере. Незаконченная попытка не записывается. Карточку можно перетащить или нажать на неё, а потом на нужное место.</p></div>';
    const fill = screenEl.querySelector('#trip-fill');
    if (fill) fill.style.height = '100%';
    chrome();
    const who = heroName();
    PG.mascot.say(
      done === PG.content.games.length
        ? (who ? who + ', карта сияет!' : 'Карта сияет! Все локации пройдены.')
        : 'Куда отправимся? Можно выбрать любое место.',
      done ? 'cheer' : 'happy'
    );
    screenEl.querySelectorAll('[data-game]').forEach(function (button) {
      button.addEventListener('click', function () { openGame(button.dataset.game); });
    });
  }

  function showAlbum() {
    endSession();
    setTheme('day');
    show('album');
    const state = PG.storage.load();
    const html = PG.content.games.map(function (game) {
      const items = game.cards.map(function (id) {
        const card = PG.content.cards[id];
        const open = state.cards.indexOf(id) >= 0;
        if (!open) {
          return '<article class="album-card locked"><div class="fact-emoji">🔒</div><h3>Закрыто</h3><p>' +
            PG.escape(game.title) + '</p></article>';
        }
        return '<button type="button" class="album-card" data-card="' + id + '"><div class="fact-emoji">' + card.emoji +
          '</div><p class="kicker">' + PG.escape(game.place) + '</p><h3>' + PG.escape(card.title) +
          '</h3><p>' + PG.escape(card.text) + '</p></button>';
      }).join('');
      return items;
    }).join('');
    screenEl.dataset.screen = 'album';
    screenEl.innerHTML = '<div class="album"><div class="album-head"><div><p class="kicker">Коллекция</p><h2>Альбом открытий</h2></div></div>' +
      (state.cards.length ? '<div class="grid">' + html + '</div>' : '<p class="banner">Открытия появятся после первых верных ходов. Лучик уже держит альбом наготове.</p>') +
      '</div>';
    chrome();
    PG.mascot.say(state.cards.length ? 'Нажми на карточку, если хочешь прочитать её ещё раз.' : 'Альбом пока чистый. Это ненадолго.', 'think');
    screenEl.querySelectorAll('[data-card]').forEach(function (button) {
      button.addEventListener('click', function () {
        const card = PG.content.cards[button.dataset.card];
        openModal(
          '<div class="fact-emoji">' + card.emoji + '</div><p class="kicker">Карточка открытия</p><h2>' +
          PG.escape(card.title) + '</h2><p>' + PG.escape(card.text) + '</p><div class="btn-row"><button type="button" class="btn" data-close>Понятно</button></div>',
          'dismiss'
        );
        modalWindow.querySelector('[data-close]').onclick = function () { closeModal(true); };
      });
    });
  }

  function showMedals() {
    endSession();
    setTheme('day');
    show('medals');
    const state = PG.storage.load();
    const html = PG.content.medals.map(function (medal) {
      const open = state.medals.indexOf(medal.id) >= 0;
      return '<article class="medal' + (open ? '' : ' locked') + '"><div class="fact-emoji">' +
        (open ? medal.emoji : '🎖️') + '</div><h3>' + PG.escape(medal.title) + '</h3><p>' +
        PG.escape(open ? medal.text : 'Пока не получена') + '</p></article>';
    }).join('');
    screenEl.dataset.screen = 'medals';
    screenEl.innerHTML = '<div class="medals"><div class="medals-head"><div><p class="kicker">Коллекция</p><h2>Награды</h2>' +
      '<p class="note">Прогресс хранится только на этом устройстве.</p></div>' +
      '<button type="button" class="btn btn-ghost" id="btn-reset">Сбросить прогресс</button></div><div class="grid">' +
      html + '</div></div>';
    chrome();
    PG.mascot.say('Медали не сгорают, если в следующий раз звёзд будет меньше.', 'happy');
    screenEl.querySelector('#btn-reset').addEventListener('click', async function () {
      const yes = await confirmModal('Стереть звёзды, альбом и медали на этом компьютере?', 'Сбросить', 'Оставить');
      if (!yes) return;
      const sound = PG.audio.isOn();
      PG.storage.reset();
      PG.storage.update(function (data) { data.sound = sound; });
      showMedals();
      PG.mascot.say('Чистый лист. Карта снова ждёт.', 'think');
    });
  }

  function openGame(id) {
    const meta = gameById(id);
    const impl = PG.games[id];
    endSession();
    if (!meta || !impl) {
      console.error('Нет локации', id);
      return;
    }
    setTheme(meta.theme);
    show('game');
    screenEl.dataset.screen = 'game';
    screenEl.dataset.game = id;
    screenEl.innerHTML =
      '<div class="game-shell"><section class="board" id="board"></section>' +
      '<aside class="fact-panel" id="fact-panel"><div id="fact-body">' +
      '<div class="fact-emoji">🔎</div><p class="kicker">Карточка открытия</p>' +
      '<h3>Здесь появится находка</h3><p>Сделай ход — и Лучик запишет факт в альбом.</p></div></aside></div>';
    const scope = PG.createScope();
    const board = screenEl.querySelector('#board');
    let mistakes = 0;
    let assists = 0;
    let dirty = false;
    let finished = false;
    const api = {
      meta: meta,
      scope: scope,
      over: false,
      say: function (text, mood) { PG.mascot.say(text, mood || 'idle'); },
      discover: function (cardId) {
        const card = PG.content.cards[cardId];
        if (!card) {
          console.error('Нет карточки', cardId);
          return;
        }
        showFact(card, 'Карточка открытия');
        PG.storage.update(function (data) {
          if (data.cards.indexOf(cardId) === -1) data.cards.push(cardId);
        });
        PG.effects.sparkle();
        chrome();
      },
      ok: function (text) {
        dirty = true;
        PG.audio.play('ok');
        if (text) PG.mascot.say(text, 'happy');
      },
      bad: function (hint) {
        dirty = true;
        mistakes += 1;
        PG.audio.play('bad');
        PG.mascot.say(hint, 'oops');
        showFact({ emoji: '💡', title: 'Попробуй ещё раз', text: hint }, 'Подсказка');
      },
      assist: function () { assists += 1; },
      progress: function (current, total) {
        const value = total ? Math.max(0, Math.min(1, current / total)) : 0;
        progressBar.style.width = Math.round(value * 100) + '%';
        progressCount.textContent = current + ' / ' + total;
      },
      win: function () {
        if (finished) return;
        finished = true;
        api.over = true;
        const stars = PG.starsFor(mistakes, assists);
        const fresh = [];
        PG.storage.update(function (data) {
          const prev = data.games[id] || { stars: 0, done: false };
          data.games[id] = { stars: Math.max(prev.stars || 0, stars), done: true };
          meta.cards.forEach(function (cardId) {
            if (data.cards.indexOf(cardId) === -1) data.cards.push(cardId);
          });
          PG.content.medals.forEach(function (medal) {
            if (data.medals.indexOf(medal.id) === -1 && medalUnlocked(medal.id, data)) {
              data.medals.push(medal.id);
              fresh.push(medal);
            }
          });
        });
        PG.audio.play('fanfare');
        PG.effects.confetti();
        const best = PG.storage.load().games[id].stars;
        const notes = {
          3: 'Почти без ошибок — три звезды.',
          2: 'Ты разобрался и собрал две звезды.',
          1: 'Ты дошёл до конца. Это победа и одна звезда.'
        };
        const extra = best > stars ? ' Лучший результат, ' + best + ' из 3, остаётся на карте.' : '';
        const who = heroName();
        PG.mascot.say((who ? who + ', ' : '') + 'локация пройдена!', 'cheer');
        window.setTimeout(function () {
          if (!session || session.id !== id) return;
          const medalsHtml = fresh.length
            ? '<p><b>Новые медали:</b> ' + fresh.map(function (medal) { return PG.escape(medal.title); }).join(', ') + '.</p>'
            : '';
          openModal(
            '<div class="win-stars" data-screen="summary">' + PG.starHtml(stars) + '</div>' +
            '<p class="kicker">' + PG.escape(meta.place) + '</p><h2>' +
            (who ? 'Молодец, ' + PG.escape(who) + '!' : 'Молодец, хранитель!') + '</h2>' +
            '<p>' + PG.escape(notes[stars] + extra) + '</p><h3>Что нового ты узнал</h3><ul>' +
            meta.learn.map(function (line) { return '<li>' + PG.escape(line) + '</li>'; }).join('') +
            '</ul>' + medalsHtml +
            '<p>Карточки этой локации лежат в альбоме.</p><div class="btn-row">' +
            '<button type="button" class="btn btn-ghost" id="btn-to-map">На карту</button>' +
            '<button type="button" class="btn" id="btn-again">Ещё раз</button></div>',
            'win'
          );
          modalWindow.querySelector('#btn-to-map').onclick = function () { closeModal(true); showMap(); };
          modalWindow.querySelector('#btn-again').onclick = function () { closeModal(true); openGame(id); };
        }, 30);
      }
    };
    session = { id: id, meta: meta, scope: scope, dirty: function () { return dirty; }, finished: function () { return finished; } };
    chrome();
    api.say(meta.intro, 'happy');
    api.discover(meta.lead);
    api.progress(0, 1);
    try {
      impl.mount(board, api);
    } catch (err) {
      console.error(err);
      board.textContent = 'Не получилось открыть локацию. Обнови страницу.';
    }
  }

  function showHelp() {
    if (!session) return;
    const lines = session.meta.howTo.map(function (line) { return '<li>' + PG.escape(line) + '</li>'; }).join('');
    openModal('<p class="kicker">Как играть</p><h2>' + PG.escape(session.meta.title) + '</h2><ul>' + lines +
      '</ul><div class="btn-row"><button type="button" class="btn" data-close>Понятно</button></div>', 'dismiss');
    modalWindow.querySelector('[data-close]').onclick = function () { closeModal(true); };
  }

  async function goBack() {
    if (modal.dataset.mode === 'win') return;
    if (mode === 'game' && session && session.dirty() && !session.finished()) {
      const yes = await confirmModal('Вернуться на карту? Эта попытка не сохранится, прошлые звёзды останутся.', 'На карту', 'Остаться');
      if (!yes) return;
      showMap();
      return;
    }
    if (mode === 'map') showIntro();
    else if (mode === 'intro') return;
    else showMap();
  }

  async function retry() {
    if (!session) return;
    if (session.dirty() && !session.finished()) {
      const yes = await confirmModal('Начать локацию заново? Прошлые звёзды сохранятся.', 'Заново', 'Остаться');
      if (!yes) return;
    }
    openGame(session.id);
  }

  function buildSky() {
    const sky = document.getElementById('sky');
    for (let i = 0; i < 5; i += 1) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud';
      cloud.style.top = (6 + i * 16) + '%';
      cloud.style.animationDuration = (32 + i * 7) + 's';
      cloud.style.animationDelay = (-i * 6) + 's';
      sky.appendChild(cloud);
    }
    for (let i = 0; i < 18; i += 1) {
      const star = document.createElement('i');
      star.className = 'star-bit';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = (Math.random() * 2.5) + 's';
      sky.appendChild(star);
    }
  }

  function validate() {
    const content = PG.content;
    content.games.forEach(function (game) {
      if (!PG.games[game.id]) console.error('Нет модуля игры', game.id);
      if (!content.cards[game.lead]) console.error('Нет вводной карточки', game.id);
      game.cards.forEach(function (id) {
        if (!content.cards[id]) console.error('Нет карточки', id);
      });
    });
    content.chains.forEach(function (chain) {
      chain.slots.forEach(function (slot) {
        const piece = chain.pieces.find(function (item) { return item.id === slot.id; });
        if (!piece || piece.extra) console.error('Слот цепи', chain.id, slot.id);
      });
    });
    content.habits.forEach(function (habit) {
      if (!content.organs.some(function (organ) { return organ.id === habit.organ; })) {
        console.error('Привычка без органа', habit.id);
      }
    });
    content.eras.forEach(function (era) {
      era.events.forEach(function (event) {
        if (!content.cards[event.id]) console.error('Событие без карточки', event.id);
      });
    });
    content.trash.forEach(function (item) {
      if (!content.bins.some(function (bin) { return bin.id === item.kind; })) console.error('Мусор без бака', item.id);
    });
    content.homeItems.forEach(function (item) {
      if (!content.homeSlots.some(function (slot) { return slot.id === item.slot; })) console.error('Вещь без места', item.id);
    });
    content.messages.forEach(function (msg) {
      if (!content.buckets.some(function (bucket) { return bucket.id === msg.bucket; })) console.error('Письмо без папки', msg.id);
    });
    ['nw', 'center', 'black', 'siberia', 'east'].forEach(function (slot) {
      if (!content.cities.some(function (city) { return city.slot === slot; })) console.error('Пустое место города', slot);
    });
  }

  function boot() {
    PG.mascot.mount(document.getElementById('mascot'));
    buildSky();
    validate();
    const state = PG.storage.load();
    PG.audio.load(state.sound);
    syncSoundButton();
    soundBtn.addEventListener('click', function () {
      const on = PG.audio.toggle();
      PG.storage.update(function (data) { data.sound = on; });
      if (on) PG.audio.startMusic();
      syncSoundButton();
    });
    backBtn.addEventListener('click', function () { goBack(); });
    retryBtn.addEventListener('click', function () { retry(); });
    helpBtn.addEventListener('click', showHelp);
    albumBtn.addEventListener('click', showAlbum);
    medalsBtn.addEventListener('click', showMedals);
    modal.querySelector('.modal-back').addEventListener('click', function () {
      if (modal.dataset.mode === 'dismiss') closeModal(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || modal.hidden) return;
      if (modal.dataset.mode === 'dismiss') closeModal(false);
      if (modal.dataset.mode === 'confirm') closeModal(false);
    });
    showIntro();
  }

  boot();
})(window.PG = window.PG || {});
