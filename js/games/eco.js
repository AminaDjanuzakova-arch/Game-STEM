/* Эко-патруль: предметы плывут по реке, их разносят по бакам.
   Список мусора — PG.content.trash, баки — PG.content.bins. */
(function (PG) {
  PG.games = PG.games || {};

  PG.games.eco = {
    mount(board, api) {
      const queue = PG.shuffle(PG.content.trash.slice());
      const goal = queue.length;
      const active = [];
      const seenKind = Object.create(null);
      let paused = false;
      let slowed = false;
      let misses = 0;
      let last = 0;
      let spawnIn = 0.2;
      let saved = 0;
      const fails = PG.trackFails(api, board);

      const bins = PG.content.bins.map(function (bin) {
        return '<div class="bin bin-' + bin.id + '" data-dropzone data-slot="' + bin.id + '" tabindex="0">' +
          '<span>' + bin.emoji + '</span><span>' + PG.escape(bin.name) + '</span></div>';
      }).join('');

      board.innerHTML =
        '<div class="play"><div class="eco-top"><p class="task">' + PG.escape(api.meta.task) + '</p>' +
        '<button type="button" class="btn btn-small btn-ghost" id="eco-pause" aria-pressed="false">Пауза</button></div>' +
        '<div class="stage eco-stage"><div class="river" id="river"><div class="bank-label">Грязная заводь →</div></div>' +
        '<div class="picked" id="picked">Нажми на предмет или перетащи его.</div>' +
        '<div class="bins">' + bins + '</div></div></div>';

      const river = board.querySelector('#river');
      const picked = board.querySelector('#picked');

      function spawn() {
        const data = queue.shift();
        const el = document.createElement('div');
        el.className = 'piece floater';
        el.dataset.id = data.id;
        el.dataset.kind = data.kind;
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
        el.innerHTML = '<span class="piece-emoji">' + data.emoji + '</span><span class="piece-name">' + PG.escape(data.name) + '</span>';
        river.appendChild(el);
        const y = 18 + (active.length % 2) * 68;
        active.push({ el: el, data: data, x: 12, y: y });
        el.style.transform = 'translate(12px,' + y + 'px)';
      }

      function removeItem(item) {
        const pos = active.indexOf(item);
        if (pos >= 0) active.splice(pos, 1);
        item.el.remove();
      }

      function findItem(el) {
        return active.find(function (item) { return item.el === el; });
      }

      api.scope.frame(function (time) {
        if (api.over || paused) return;
        if (!last) last = time;
        const dt = Math.min(0.04, (time - last) / 1000);
        last = time;
        spawnIn -= dt;
        if (spawnIn <= 0 && active.length < 2 && queue.length) {
          spawn();
          spawnIn = 1.6;
        }
        const width = river.clientWidth || 400;
        const speed = width / (slowed || PG.prefersReduced ? 13 : 9);
        active.slice().forEach(function (item) {
          if (item.el.classList.contains('is-held') || item.el.classList.contains('is-selected')) return;
          item.x += speed * dt;
          item.el.style.transform = 'translate(' + item.x + 'px,' + item.y + 'px)';
          if (item.x > width - 70) {
            item.x = 8;
            api.bad('Уплыло в заводь. ' + PG.content.binHints[item.data.kind]);
            fails(item.data.id, '[data-slot="' + item.data.kind + '"]');
            misses += 1;
            if (!slowed && misses >= 4) {
              slowed = true;
              api.say('Я замедлил реку. Спешить не нужно.', 'think');
            }
          }
        });
      });

      api.scope.listen(board.querySelector('#eco-pause'), 'click', function () {
        paused = !paused;
        const button = board.querySelector('#eco-pause');
        button.setAttribute('aria-pressed', paused ? 'true' : 'false');
        button.textContent = paused ? 'Дальше' : 'Пауза';
        api.say(paused ? 'Река замерла. Можно спокойно разложить.' : 'Река снова течёт.', 'think');
      });

      api.scope.add(PG.drag.delegate(board, {
        onSelect: function (piece) {
          const item = findItem(piece);
          picked.textContent = item ? 'Выбрано: ' + item.data.name + '. Нажми нужный бак.' : 'Нажми на предмет.';
        },
        onDrop: function (piece, zone) {
          const item = findItem(piece);
          if (!item || piece.classList.contains('is-locked')) return;
          if (item.data.kind !== zone.dataset.slot) {
            api.bad(PG.content.binHints[item.data.kind]);
            PG.shake(piece);
            PG.shake(zone);
            fails(item.data.id, '[data-slot="' + item.data.kind + '"]');
            piece.classList.remove('is-selected');
            misses += 1;
            if (!slowed && misses >= 4) {
              slowed = true;
              api.say('Я замедлил реку. Спешить не нужно.', 'think');
            }
            return;
          }
          if (!seenKind[item.data.kind]) {
            seenKind[item.data.kind] = true;
            api.discover(PG.content.binCards[item.data.kind]);
          }
          saved += 1;
          removeItem(item);
          piece.classList.remove('is-selected');
          api.ok(item.data.kind === 'animal' ? 'Зверь ушёл в чистый лес.' : 'Лежит в своём баке.');
          picked.textContent = 'Собрано ' + saved + ' из ' + goal + '.';
          api.progress(saved, goal);
          zone.classList.remove('drop-hot');
          if (saved === goal) api.win();
        }
      }));

      spawn();
      api.progress(0, goal);
    }
  };
})(window.PG = window.PG || {});
