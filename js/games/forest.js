/* Лесная цепь питания. Новая цепь добавляется в PG.content.chains. */
(function (PG) {
  PG.games = PG.games || {};

  PG.games.forest = {
    mount(board, api) {
      let index = 0;
      const fails = PG.trackFails(api, board);

      function render() {
        const chain = PG.content.chains[index];
        const slots = chain.slots.map(function (slot, slotIndex) {
          return (
            '<div class="chain-slot" data-dropzone data-slot="' + slot.id + '" data-index="' + slotIndex + '" tabindex="0">' +
            '<span class="role">' + PG.escape(slot.role) + '</span></div>'
          );
        }).join('<div class="arrow" aria-hidden="true">→</div>');
        const pieces = PG.shuffle(chain.pieces).map(function (piece) {
          return PG.piece(piece);
        }).join('');
        board.innerHTML =
          '<div class="play"><p class="task">' + PG.escape(chain.title) + '. ' + PG.escape(api.meta.task) + '</p>' +
          '<div class="stage"><div class="woods" id="woods"><div class="tree t1"></div><div class="tree t2"></div><div class="tree t3"></div>' +
          '<div class="flower f1"></div><div class="flower f2"></div><div class="flower f3"></div><div class="birdie">🐦</div></div>' +
          '<div class="chain">' + slots + '</div><div class="next-row" id="next-row"></div></div>' +
          '<div class="tray">' + pieces + '</div></div>';
        api.progress(index, PG.content.chains.length);
      }

      function hintFor(piece, slotIndex, chain) {
        const data = chain.pieces.find(function (item) { return item.id === piece.dataset.id; });
        if (data.extra) return data.hint;
        const correct = chain.slots.findIndex(function (slot) { return slot.id === data.id; });
        if (slotIndex < correct) return data.name + ' стоит дальше. Сначала тот, кого едят.';
        return data.name + ' стоит ближе к началу. Стрелка ведёт к тому, кто ест.';
      }

      render();
      if (index === 0) api.discover('forest-sun');

      api.scope.add(PG.drag.delegate(board, {
        onDrop: function (piece, zone) {
          if (piece.classList.contains('is-locked') || zone.classList.contains('is-locked')) return;
          const chain = PG.content.chains[index];
          const slotIndex = Number(zone.dataset.index);
          if (zone.dataset.slot !== piece.dataset.id) {
            const woods = board.querySelector('#woods');
            woods.classList.remove('bloom');
            woods.classList.add('wilt');
            api.bad(hintFor(piece, slotIndex, chain));
            PG.shake(zone);
            fails(piece.dataset.id, '[data-slot="' + piece.dataset.id + '"]');
            api.scope.later(function () { woods.classList.remove('wilt'); }, 900);
            return;
          }
          piece.classList.add('is-locked');
          piece.classList.remove('is-selected');
          zone.classList.add('is-locked', 'is-filled');
          zone.appendChild(piece);
          const filled = chain.slots.every(function (slot) {
            return board.querySelector('[data-slot="' + slot.id + '"] .piece');
          });
          if (!filled) {
            api.ok('Это звено на месте.');
            return;
          }
          board.querySelector('#woods').classList.add('bloom');
          api.ok('Цепь собрана, лес ожил!');
          api.discover(chain.card);
          const last = index === PG.content.chains.length - 1;
          if (last) api.discover('forest-balance');
          const row = board.querySelector('#next-row');
          row.innerHTML = '<button type="button" class="btn btn-primary" data-action="next">' +
            (last ? 'Готово' : 'Следующая цепь') + '</button>';
          api.progress(index + 1, PG.content.chains.length);
        }
      }));

      api.scope.listen(board, 'click', function (event) {
        const button = event.target.closest('[data-action="next"]');
        if (!button) return;
        if (index === PG.content.chains.length - 1) {
          api.win();
          return;
        }
        index += 1;
        render();
        api.say('Новая поляна. Стрелка снова ведёт к тому, кто ест.', 'think');
      });
    }
  };
})(window.PG = window.PG || {});
