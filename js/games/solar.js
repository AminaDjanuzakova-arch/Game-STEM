/* Космический корабль: планеты расставляются по орбитам от Солнца.
   Карточка планеты — объект в PG.content.planets, факт — карточка с тем же id. */
(function (PG) {
  PG.games = PG.games || {};

  function orb(id) {
    return '<span class="orb orb-' + id + '" aria-hidden="true"></span>';
  }

  PG.games.solar = {
    mount(board, api) {
      const planets = PG.content.planets;
      const majors = planets.filter(function (p) { return !p.dwarf; });
      const lanes = majors.map(function (planet, index) {
        const caption = index === 0 ? 'ближе к Солнцу' : index === majors.length - 1 ? 'дальше всех' : 'орбита';
        return (
          '<div class="lane" data-dropzone data-slot="' + planet.id + '" tabindex="0">' +
          '<span class="lane-index">' + (index + 1) + '</span>' +
          '<span class="lane-caption">' + caption + '</span></div>'
        );
      }).join('');
      const tray = PG.shuffle(planets).map(function (planet) {
        return (
          '<div class="piece" data-id="' + planet.id + '" role="button" tabindex="0">' +
          orb(planet.id) + '<span class="piece-name">' + PG.escape(planet.name) + '</span></div>'
        );
      }).join('');
      board.innerHTML =
        '<div class="play"><p class="task">' + PG.escape(api.meta.task) + '</p>' +
        '<div class="stage"><div class="solar-stage"><div class="sun-col"><div class="sun-orb"></div><span>Солнце</span></div>' +
        '<div class="lanes">' + lanes + '</div></div>' +
        '<div class="pluto-zone" data-dropzone data-slot="pluto" tabindex="0">Карликовые планеты</div></div>' +
        '<div class="tray solar-tray">' + tray + '</div></div>';

      const fails = PG.trackFails(api, board);
      api.progress(0, planets.length);
      api.scope.add(PG.drag.delegate(board, {
        onDrop: function (piece, zone) {
          if (piece.classList.contains('is-locked')) return;
          const id = piece.dataset.id;
          if (id !== zone.dataset.slot) {
            const planet = planets.find(function (item) { return item.id === id; });
            api.bad(planet.hint);
            PG.shake(piece);
            PG.shake(zone);
            fails(id, '[data-slot="' + id + '"]');
            return;
          }
          piece.classList.remove('is-selected');
          piece.classList.add('is-locked');
          zone.classList.add('is-filled', 'is-locked');
          zone.appendChild(piece);
          api.ok(id === 'pluto' ? 'Плутон на своём месте, среди карликовых.' : 'Планета села на орбиту!');
          api.discover(id);
          const placed = board.querySelectorAll('.is-filled').length;
          api.progress(placed, planets.length);
          if (placed === planets.length) api.win();
        }
      }));
    }
  };
})(window.PG = window.PG || {});
