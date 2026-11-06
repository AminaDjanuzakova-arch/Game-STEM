/* Три сценки: дорога (поиск места), дом и переписка (перетаскивание). */
(function (PG) {
  PG.games = PG.games || {};

  PG.games.safety = {
    mount(board, api) {
      let scene = 'road';
      let step = 0;
      let look = [];
      const fails = PG.trackFails(api, board);

      function pips() {
        const names = ['road', 'home', 'net'];
        return '<div class="pips">' + names.map(function (name) {
          const on = names.indexOf(name) <= names.indexOf(scene);
          return '<div class="pip' + (on ? ' on' : '') + '"></div>';
        }).join('') + '</div>';
      }

      function roadHtml() {
        const light = step >= 2 ? 'green' : 'red';
        const looks = step === 2
          ? '<div class="look-row"><button type="button" class="btn btn-blue" data-action="left">Налево</button>' +
            '<button type="button" class="btn btn-blue" data-action="right">Направо</button>' +
            '<p class="task">Порядок: налево, направо, ещё раз налево. Сделано: ' + look.length + ' из 3.</p></div>'
          : '';
        const go = step === 3
          ? '<div class="next-row"><button type="button" class="btn btn-primary" data-action="go">Иду по зебре</button></div>'
          : '';
        return '<div class="street"><div class="light ' + light + '"><i class="r"></i><i></i><i class="g"></i></div>' +
          (step === 0 ? '<button type="button" class="hot cars" data-action="cars">Выйти из-за машин</button><button type="button" class="hot road" data-action="road">Перейти здесь</button><button type="button" class="hot zebra" data-action="zebra"><span>Зебра</span></button>' : '') +
          (step === 1 ? '<button type="button" class="hot road" data-action="rush">Идти на красный</button><button type="button" class="hot cars" data-action="phone">Смотреть в телефон</button><button type="button" class="hot zebra" data-action="wait">Подождать зелёный</button>' : '') +
          '<div class="hero-token' + (step >= 1 ? ' at-zebra' : '') + (step > 3 ? ' crossed' : '') + '">🧒</div></div>' +
          looks + go;
      }

      function homeHtml() {
        const dangers = PG.content.homeItems.map(function (item, index) {
          return '<span class="danger" data-danger="' + item.id + '" style="left:' + (8 + index * 18) + '%;top:24px">' + item.emoji + '</span>';
        }).join('');
        const slots = PG.content.homeSlots.map(function (slot) {
          return '<div class="home-slot" data-dropzone data-slot="' + slot.id + '" tabindex="0"><span>' +
            slot.emoji + '</span><span>' + PG.escape(slot.name) + '</span></div>';
        }).join('');
        const tray = PG.shuffle(PG.content.homeItems).map(function (item) { return PG.piece(item); }).join('');
        return '<div class="room" id="room">' + dangers + '</div><div class="home-slots">' + slots + '</div><div class="tray">' + tray + '</div>';
      }

      function netHtml() {
        const tray = PG.shuffle(PG.content.messages).map(function (msg) {
          return '<div class="piece msg" data-id="' + msg.id + '" role="button" tabindex="0"><small>' +
            PG.escape(msg.from) + '</small><span class="piece-name">' + PG.escape(msg.text) + '</span></div>';
        }).join('');
        const buckets = PG.content.buckets.map(function (bucket) {
          return '<div class="bucket" data-dropzone data-slot="' + bucket.id + '" tabindex="0"><span>' +
            bucket.emoji + '</span><span>' + PG.escape(bucket.name) + '</span></div>';
        }).join('');
        return '<div class="phone">' + tray + '</div><div class="buckets">' + buckets + '</div>';
      }

      function paint() {
        let inner = roadHtml();
        let task = 'Дойди до школы безопасно.';
        if (scene === 'home') {
          inner = homeHtml();
          task = 'Убери опасные вещи на их места.';
        }
        if (scene === 'net') {
          inner = netHtml();
          task = 'Разложи сообщения. Секреты и ссылки на призы не открывай.';
        }
        board.innerHTML = '<div class="play">' + pips() + '<p class="task">' + task + '</p><div class="stage">' + inner +
          '<div class="next-row" id="next-row"></div></div></div>';
      }

      function finishScene(next, line) {
        api.say(line, 'happy');
        const row = board.querySelector('#next-row');
        if (!row) return;
        if (!next) {
          row.innerHTML = '<button type="button" class="btn btn-primary" data-action="win">Готово</button>';
          return;
        }
        row.innerHTML = '<button type="button" class="btn btn-primary" data-action="next">' + next + '</button>';
      }

      paint();
      api.say('Сначала дорога. Куда встать, чтобы перейти?', 'think');
      api.progress(0, 3);

      api.scope.listen(board, 'click', function (event) {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.dataset.action;
        if (action === 'next') {
          if (scene === 'road') {
            scene = 'home';
            api.discover('safety-road');
            api.discover('safety-112');
          } else if (scene === 'home') {
            scene = 'net';
            api.discover('safety-home');
          }
          step = 0;
          look = [];
          paint();
          api.progress(scene === 'home' ? 1 : 2, 3);
          api.say(scene === 'home' ? 'Дома тоже есть свои правила.' : 'Теперь планшет. Не всё, что написано, правда.', 'think');
          return;
        }
        if (action === 'win') {
          api.discover('safety-net');
          api.discover('safety-mom');
          api.win();
          return;
        }
        if (scene !== 'road') return;
        if (step === 0) {
          if (action === 'zebra') {
            step = 1;
            api.ok('Зебра — место для перехода.');
            paint();
            api.say('Светофор красный. Что делаем?', 'think');
          } else if (action === 'cars') {
            api.bad('Не выходи из-за стоящих машин: водитель тебя не видит.');
          } else {
            api.bad('Где удобно — не значит безопасно. Ищи зебру.');
          }
          return;
        }
        if (step === 1) {
          if (action === 'wait') {
            step = 2;
            api.ok('Зелёный зажёгся. Теперь смотрим по сторонам.');
            paint();
          } else if (action === 'phone') {
            api.bad('На переходе телефон убирают. Сначала дорога.');
          } else {
            api.bad('Горит красный. Подожди зелёный, даже если машин не видно.');
          }
          return;
        }
        if (step === 2) {
          if (action !== 'left' && action !== 'right') return;
          const expect = ['left', 'right', 'left'][look.length];
          if (action !== expect) {
            look = [];
            api.bad('Сначала налево, потом направо и ещё раз налево. Начнём смотреть сначала.');
            paint();
            return;
          }
          look.push(action);
          if (look.length === 3) {
            step = 3;
            api.ok('Ты посмотрел правильно. Можно идти по зебре.');
            paint();
          } else {
            paint();
            api.say(look.length === 1 ? 'Теперь направо.' : 'И ещё раз налево.', 'think');
          }
          return;
        }
        if (step === 3 && action === 'go') {
          const token = board.querySelector('.hero-token');
          if (token) token.classList.add('crossed');
          api.ok('Ты на другой стороне.');
          finishScene('Дальше: дом', 'Дорога пройдена.');
        }
      });

      api.scope.add(PG.drag.delegate(board, {
        onDrop: function (piece, zone) {
          if (piece.classList.contains('is-locked')) return;
          if (scene === 'home') {
            const item = PG.content.homeItems.find(function (entry) { return entry.id === piece.dataset.id; });
            if (!item || item.slot !== zone.dataset.slot) {
              api.bad(item ? item.hint : 'Этой вещи здесь не место.');
              PG.shake(piece);
              if (item) fails(item.id, '[data-slot="' + item.slot + '"]');
              return;
            }
            piece.classList.add('is-locked');
            piece.classList.remove('is-selected');
            zone.classList.add('is-locked');
            zone.appendChild(piece);
            const mark = board.querySelector('[data-danger="' + item.id + '"]');
            if (mark) mark.classList.add('gone');
            api.ok('Так гораздо спокойнее.');
            const placed = board.querySelectorAll('.home-slot .piece').length;
            if (placed === PG.content.homeItems.length) {
              board.querySelector('#room').classList.add('safe');
              finishScene('Дальше: планшет', 'Дом стал безопаснее.');
            }
            return;
          }
          if (scene !== 'net') return;
          const msg = PG.content.messages.find(function (entry) { return entry.id === piece.dataset.id; });
          if (!msg || msg.bucket !== zone.dataset.slot) {
            const bucket = msg ? msg.bucket : 'danger';
            api.bad(PG.content.messageHints[bucket]);
            PG.shake(piece);
            if (msg) fails(msg.id, '[data-slot="' + msg.bucket + '"]');
            return;
          }
          piece.classList.add('is-locked', 'is-chip');
          piece.classList.remove('is-selected', 'msg');
          piece.innerHTML = '<span class="piece-name">' + PG.escape(msg.from) + '</span>';
          zone.appendChild(piece);
          api.ok(msg.bucket === 'reply' ? 'Этому ответить можно.' : 'Верное решение.');
          if (msg.bucket === 'ask') api.discover('safety-mom');
          const placed = PG.content.messages.filter(function (entry) {
            return board.querySelector('.piece[data-id="' + entry.id + '"].is-locked');
          }).length;
          if (placed === PG.content.messages.length) {
            finishScene('', 'Переписка разобрана.');
          }
        }
      }));
    }
  };
})(window.PG = window.PG || {});
