/* Карта России: сначала природные зоны с севера на юг, затем города.
   Зоны и города лежат в PG.content.zones и PG.content.cities. */
(function (PG) {
  PG.games = PG.games || {};
  const cityPlaces = [
    { id: 'nw', title: 'Северо-запад', note: 'Балтика, Нева' },
    { id: 'center', title: 'Центр', note: 'европейская часть' },
    { id: 'black', title: 'Чёрное море', note: 'юг, субтропики' },
    { id: 'siberia', title: 'Сибирь', note: 'река Обь' },
    { id: 'east', title: 'Дальний Восток', note: 'Японское море' }
  ];

  PG.games.russia = {
    mount(board, api) {
      let phase = 'zones';
      const fails = PG.trackFails(api, board);
      const zones = PG.content.zones;

      function zoneMap() {
        return '<div class="compass">Север</div>' + zones.map(function (zone) {
          const inner = phase === 'cities'
            ? '<span class="piece-emoji">' + zone.emoji + '</span><span>' + PG.escape(zone.name) + '</span>'
            : '<span class="zone-placeholder">' + (zone.id === 'arctic' ? 'самая холодная зона' : 'зона') + '</span>';
          return '<div class="zone-slot ' + zone.tone + '" data-dropzone data-slot="' + zone.id + '" tabindex="0">' +
            inner + '</div>';
        }).join('') + '<div class="compass">Юг</div>';
      }

      function paint() {
        const tray = phase === 'zones'
          ? PG.shuffle(zones).map(function (zone) { return PG.piece(zone, 'wide'); }).join('')
          : PG.shuffle(PG.content.cities).map(function (city) {
            return '<div class="piece wide city-piece" data-id="' + city.id + '" role="button" tabindex="0">' +
              '<span class="piece-emoji">' + city.emoji + '</span>' +
              '<span class="piece-name">' + PG.escape(city.name) + '</span>' +
              '<small>' + PG.escape(city.riddle) + '</small></div>';
          }).join('');
        const cities = phase === 'cities'
          ? '<div class="city-board">' + cityPlaces.map(function (place) {
            return '<div class="city-slot" data-dropzone data-slot="' + place.id + '" tabindex="0"><b>' +
              place.title + '</b><small>' + place.note + '</small></div>';
          }).join('') + '</div>'
          : '';
        const task = phase === 'zones'
          ? api.meta.task
          : 'Поставь город на подпись места. Подсказка написана на карточке.';
        board.innerHTML =
          '<div class="play"><p class="task">' + PG.escape(task) + '</p>' +
          '<div class="stage"><div class="zone-map' + (phase === 'cities' ? ' compact' : '') + '">' + zoneMap() + '</div>' +
          cities + '<div class="next-row" id="next-row"></div></div><div class="tray">' + tray + '</div></div>';
        if (phase === 'cities') {
          board.querySelectorAll('.zone-slot').forEach(function (slot) { slot.classList.add('is-locked', 'is-filled'); });
        }
      }

      paint();
      api.progress(0, zones.length + PG.content.cities.length);

      api.scope.add(PG.drag.delegate(board, {
        onDrop: function (piece, zone) {
          if (piece.classList.contains('is-locked') || zone.classList.contains('is-locked')) return;
          const id = piece.dataset.id;
          if (phase === 'zones') {
            if (id !== zone.dataset.slot) {
              const zoneData = zones.find(function (item) { return item.id === id; });
              api.bad(zoneData.hint);
              PG.shake(piece);
              fails(id, '[data-slot="' + id + '"]');
              return;
            }
            const data = zones.find(function (item) { return item.id === id; });
            piece.classList.add('is-locked');
            piece.classList.remove('is-selected');
            zone.classList.add('is-filled', 'is-locked');
            zone.innerHTML = '<span class="piece-emoji">' + data.emoji + '</span><span>' + PG.escape(data.name) + '</span>';
            piece.remove();
            api.ok(data.name + ' легли на схему.');
            api.discover(id);
            const placed = board.querySelectorAll('.zone-slot.is-filled').length;
            api.progress(placed, zones.length + PG.content.cities.length);
            if (placed === zones.length) {
              board.querySelector('#next-row').innerHTML =
                '<button type="button" class="btn btn-primary" data-action="next">Расставить города</button>';
            }
            return;
          }
          const city = PG.content.cities.find(function (item) { return item.id === id; });
          if (!city || city.slot !== zone.dataset.slot) {
            api.bad(city ? city.hint : 'Этот город стоит в другом краю.');
            PG.shake(piece);
            if (city) fails(city.id, '[data-slot="' + city.slot + '"]');
            return;
          }
          piece.classList.add('is-locked');
          piece.classList.remove('is-selected');
          zone.classList.add('is-filled', 'is-locked');
          zone.appendChild(piece);
          api.ok(city.name + ' на месте.');
          api.discover('city-' + city.id);
          const placedCities = board.querySelectorAll('.city-slot.is-filled').length;
          api.progress(zones.length + placedCities, zones.length + PG.content.cities.length);
          if (placedCities === PG.content.cities.length) api.win();
        }
      }));

      api.scope.listen(board, 'click', function (event) {
        if (!event.target.closest('[data-action="next"]')) return;
        phase = 'cities';
        paint();
        api.say('Зоны собраны. Теперь города: читай загадку на карточке.', 'happy');
      });
    }
  };
})(window.PG = window.PG || {});
