/* Машина времени: два захода по ленте. События — PG.content.eras. */
(function (PG) {
  PG.games = PG.games || {};

  PG.games.time = {
    mount(board, api) {
      let round = 0;
      const fails = PG.trackFails(api, board);
      const total = PG.content.eras.reduce(function (sum, era) { return sum + era.events.length; }, 0);

      function render() {
        const era = PG.content.eras[round];
        const slots = era.events.map(function (event) {
          return '<li data-dropzone data-slot="' + event.year + '" tabindex="0"><b>' + event.year + '</b><span>событие</span></li>';
        }).join('');
        const tray = PG.shuffle(era.events).map(function (event) {
          return PG.piece(event, 'wide');
        }).join('');
        board.innerHTML =
          '<div class="play"><p class="task">' + PG.escape(era.title) + '. ' + PG.escape(api.meta.task) + '</p>' +
          '<div class="stage"><div class="time-layout"><div class="machine"><div class="capsule" id="capsule"></div></div>' +
          '<ol class="timeline">' + slots + '</ol></div><div class="next-row" id="next-row"></div></div>' +
          '<div class="tray">' + tray + '</div></div>';
        api.progress(round === 0 ? 0 : PG.content.eras[0].events.length, total);
      }

      render();

      api.scope.add(PG.drag.delegate(board, {
        onDrop: function (piece, zone) {
          if (piece.classList.contains('is-locked') || zone.classList.contains('is-locked')) return;
          const era = PG.content.eras[round];
          const event = era.events.find(function (item) { return item.id === piece.dataset.id; });
          if (!event || event.year !== zone.dataset.slot) {
            const slotYear = Number(zone.dataset.slot);
            const when = event && Number(event.year) < slotYear ? ' Это было раньше выбранного года.' : ' Это было позже выбранного года.';
            api.bad((event ? event.era : 'Событие из другого времени.') + when);
            PG.shake(piece);
            PG.shake(board.querySelector('.machine'));
            if (event) fails(event.id, '[data-slot="' + event.year + '"]');
            return;
          }
          piece.classList.add('is-locked');
          piece.classList.remove('is-selected');
          zone.classList.add('is-locked', 'is-filled');
          zone.appendChild(piece);
          const index = era.events.findIndex(function (item) { return item.id === event.id; });
          const capsule = board.querySelector('#capsule');
          capsule.style.top = (8 + index * 22) + '%';
          api.ok('Год совпал. Машина делает остановку.');
          api.discover(event.id);
          const filled = era.events.filter(function (item) {
            return board.querySelector('[data-slot="' + item.year + '"].is-filled');
          }).length;
          const base = round === 0 ? 0 : PG.content.eras[0].events.length;
          api.progress(base + filled, total);
          if (filled !== era.events.length) return;
          if (round === PG.content.eras.length - 1) {
            api.win();
            return;
          }
          board.querySelector('#next-row').innerHTML =
            '<button type="button" class="btn btn-primary" data-action="next">' + PG.escape(era.next) + '</button>';
        }
      }));

      api.scope.listen(board, 'click', function (event) {
        if (!event.target.closest('[data-action="next"]')) return;
        round += 1;
        render();
        api.say('Прыгаем ближе к нашим дням. Годы снова ждут события.', 'cheer');
      });
    }
  };
})(window.PG = window.PG || {});
