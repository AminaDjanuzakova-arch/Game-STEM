/* Доктор Тело: сначала поиск органа на силуэте, потом привычки.
   Порядок поиска — массив PG.content.organs. */
(function (PG) {
  PG.games = PG.games || {};

  PG.games.body = {
    mount(board, api) {
      const organs = PG.content.organs;
      let cursor = 0;
      const found = Object.create(null);
      let phase = 'seek';
      const fails = PG.trackFails(api, board);

      function kidClass() {
        return phase === 'seek' ? 'seek-' + organs[cursor].id : '';
      }

      function listHtml() {
        if (phase === 'seek') {
          return organs.map(function (organ, index) {
            const state = found[organ.id] ? 'done' : index === cursor ? 'true' : 'false';
            const pressed = index === cursor && !found[organ.id];
            return '<button type="button" class="pick' + (found[organ.id] ? ' done' : '') +
              '" data-pick="' + organ.id + '" aria-pressed="' + (pressed ? 'true' : 'false') + '">' +
              organ.emoji + ' ' + PG.escape(organ.name) + (found[organ.id] ? ' ✓' : '') + '</button>';
          }).join('');
        }
        return organs.map(function (organ) {
          return '<div class="organ-drop" data-dropzone data-slot="' + organ.id + '" tabindex="0">' +
            organ.emoji + ' ' + PG.escape(organ.name) + '</div>';
        }).join('');
      }

      function paint() {
        const habits = phase === 'habits'
          ? '<div class="tray">' + PG.shuffle(PG.content.habits).map(function (item) { return PG.piece(item); }).join('') + '</div>'
          : '';
        board.innerHTML =
          '<div class="play"><p class="task">' + PG.escape(phase === 'seek' ? api.meta.task : 'Перетащи полезную привычку к нужному органу.') + '</p>' +
          '<div class="stage"><div class="body-layout"><div class="kid ' + kidClass() + '" id="kid">' +
          '<div class="hair"></div><div class="head"></div><i class="eye-dot l"></i><i class="eye-dot r"></i><i class="smile-line"></i>' +
          '<div class="arm arm-l"></div><div class="torso"></div><div class="arm arm-r"></div>' +
          '<div class="leg leg-l"></div><div class="leg leg-r"></div>' +
          '<button type="button" class="hotspot hs-brain' + (found.brain ? ' found' : '') + '" data-organ="brain" aria-label="Голова"><span>🧠</span></button>' +
          '<button type="button" class="hotspot hs-lungs' + (found.lungs ? ' found' : '') + '" data-organ="lungs" aria-label="Грудь"><span>🌬️</span></button>' +
          '<button type="button" class="hotspot hs-heart' + (found.heart ? ' found' : '') + '" data-organ="heart" aria-label="Сердце"><span>❤️</span></button>' +
          '<button type="button" class="hotspot hs-stomach' + (found.stomach ? ' found' : '') + '" data-organ="stomach" aria-label="Живот"><span>🥣</span></button>' +
          '<button type="button" class="hotspot hs-skin' + (found.skin ? ' found' : '') + '" data-organ="skin" aria-label="Ладонь"><span>🧼</span></button>' +
          '<button type="button" class="hotspot hs-bones' + (found.bones ? ' found' : '') + '" data-organ="bones" aria-label="Нога"><span>🦴</span></button>' +
          '</div><div class="organ-col">' + listHtml() + '</div></div></div>' + habits + '</div>';
      }

      function startHabits() {
        phase = 'habits';
        api.discover('kidneys');
        api.say('Органы на месте. Теперь разложи полезные привычки.', 'cheer');
        paint();
        api.progress(organs.length, organs.length + PG.content.habits.length);
      }

      paint();
      api.say(organs[0].clue, 'think');
      api.progress(0, organs.length + PG.content.habits.length);

      api.scope.listen(board, 'click', function (event) {
        if (phase !== 'seek') return;
        const pick = event.target.closest('[data-pick]');
        if (pick) {
          const chosen = organs.find(function (item) { return item.id === pick.dataset.pick; });
          if (!chosen || found[chosen.id]) {
            api.say((chosen ? chosen.name : 'Орган') + ' уже найден.', 'happy');
            return;
          }
          cursor = organs.findIndex(function (item) { return item.id === chosen.id; });
          api.say(chosen.clue, 'think');
          paint();
          return;
        }
        const hotspot = event.target.closest('[data-organ]');
        if (!hotspot) return;
        const wanted = organs[cursor];
        if (hotspot.dataset.organ !== wanted.id) {
          api.bad(wanted.wrong + ' ' + wanted.clue);
          PG.shake(board.querySelector('#kid'));
          fails(wanted.id, '.hs-' + wanted.id);
          return;
        }
        found[wanted.id] = true;
        hotspot.classList.add('found');
        api.ok(wanted.name + ' нашлось!');
        api.discover(wanted.id);
        cursor += 1;
        api.progress(cursor, organs.length + PG.content.habits.length);
        if (cursor >= organs.length) {
          startHabits();
          return;
        }
        api.say(organs[cursor].clue, 'think');
        paint();
      });

      api.scope.add(PG.drag.delegate(board, {
        onDrop: function (piece, zone) {
          if (phase !== 'habits' || piece.classList.contains('is-locked')) return;
          const habit = PG.content.habits.find(function (item) { return item.id === piece.dataset.id; });
          if (!habit || habit.organ !== zone.dataset.slot) {
            api.bad(habit ? habit.hint : 'Эта привычка нужна другому органу.');
            PG.shake(piece);
            if (habit) fails(habit.id, '[data-slot="' + habit.organ + '"]');
            return;
          }
          piece.classList.add('is-locked');
          piece.classList.remove('is-selected');
          zone.classList.add('is-locked', 'is-filled');
          zone.appendChild(piece);
          api.ok('Полезная привычка на своём месте.');
          const placed = board.querySelectorAll('.organ-drop .piece').length;
          api.progress(organs.length + placed, organs.length + PG.content.habits.length);
          if (placed === PG.content.habits.length) api.win();
        }
      }));
    }
  };
})(window.PG = window.PG || {});
