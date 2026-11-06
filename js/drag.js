/* Перетаскивание мышью, пальцем и пером.
   Второй способ для доски и планшета: нажать на карточку, потом на место.
   Точка попадания для пальца сдвинута к карточке, которую палец не закрывает. */
(function (PG) {
  const THRESHOLD = 8;

  function zonesAt(x, y) {
    const stack = document.elementsFromPoint(x, y);
    const found = [];
    for (let i = 0; i < stack.length; i += 1) {
      const zone = stack[i].closest('[data-dropzone]');
      if (zone && !zone.classList.contains('is-locked') && found.indexOf(zone) === -1) found.push(zone);
    }
    return found;
  }

  PG.drag = {
    delegate(root, options) {
      const pieceSelector = options.piece || '.piece';
      const zoneSelector = options.zone || '[data-dropzone]';
      let ghost = null;
      let held = null;

      function clearHot() {
        root.querySelectorAll('.drop-hot').forEach(function (zone) { zone.classList.remove('drop-hot'); });
      }

      function removeGhost() {
        if (ghost) ghost.remove();
        ghost = null;
        if (held) held.classList.remove('is-ghost-source', 'is-held');
        document.body.classList.remove('is-dragging');
        clearHot();
      }

      function zoneInRoot(x, y) {
        const list = zonesAt(x, y);
        for (let i = 0; i < list.length; i += 1) {
          if (root.contains(list[i])) return list[i];
        }
        return null;
      }

      /* Палец закрывает карточку, поэтому картинка чуть выше.
         Попадание засчитывается и под пальцем, и под картинкой. */
      function hover(x, y, lift) {
        clearHot();
        const zone = zoneInRoot(x, y) || (lift ? zoneInRoot(x, y - lift) : null);
        if (zone) zone.classList.add('drop-hot');
        return zone;
      }

      function select(piece) {
        const already = piece.classList.contains('is-selected');
        root.querySelectorAll(pieceSelector + '.is-selected').forEach(function (node) {
          node.classList.remove('is-selected');
        });
        if (!already) {
          piece.classList.add('is-selected');
          if (options.onSelect) options.onSelect(piece);
        }
      }

      function onDown(event) {
        const piece = event.target.closest(pieceSelector);
        if (!piece || !root.contains(piece) || piece.classList.contains('is-locked')) return;
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        const pointerId = event.pointerId;
        const pointerType = event.pointerType || 'mouse';
        const lift = pointerType === 'touch' ? 48 : 0;
        const startX = event.clientX;
        const startY = event.clientY;
        let dragging = false;
        held = piece;
        piece.classList.add('is-held');
        try { piece.setPointerCapture(pointerId); } catch (err) { /* указатель уже отпущен */ }

        function move(ev) {
          if (ev.pointerId !== pointerId) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (!dragging && Math.hypot(dx, dy) > THRESHOLD) {
            dragging = true;
            piece.classList.remove('is-selected');
            ghost = piece.cloneNode(true);
            ghost.classList.add('drag-ghost');
            ghost.classList.remove('is-selected', 'is-held');
            ghost.removeAttribute('id');
            ghost.setAttribute('aria-hidden', 'true');
            ghost.style.width = Math.min(piece.offsetWidth, 240) + 'px';
            document.body.appendChild(ghost);
            piece.classList.add('is-ghost-source');
            document.body.classList.add('is-dragging');
          }
          if (!dragging || !ghost) return;
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          ghost.style.transform = 'translate(-50%, calc(-50% - ' + lift + 'px))';
          hover(ev.clientX, ev.clientY, lift);
        }

        function up(ev) {
          if (ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
          piece.removeEventListener('pointermove', move);
          piece.removeEventListener('pointerup', up);
          piece.removeEventListener('pointercancel', up);
          const wasDrag = dragging;
          const zone = wasDrag ? hover(ev.clientX, ev.clientY, lift) : null;
          removeGhost();
          held = null;
          if (wasDrag) {
            if (zone && root.contains(zone)) options.onDrop(piece, zone, 'drag');
            return;
          }
          select(piece);
        }

        piece.addEventListener('pointermove', move);
        piece.addEventListener('pointerup', up);
        piece.addEventListener('pointercancel', up);
      }

      function onRootUp(event) {
        const zone = event.target.closest(zoneSelector);
        if (!zone || !root.contains(zone)) return;
        const piece = root.querySelector(pieceSelector + '.is-selected');
        if (!piece || piece.contains(event.target)) return;
        options.onDrop(piece, zone, 'tap');
      }

      function onKey(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const piece = event.target.closest(pieceSelector);
        if (piece && root.contains(piece) && !piece.classList.contains('is-locked')) {
          event.preventDefault();
          select(piece);
          return;
        }
        const zone = event.target.closest(zoneSelector);
        if (!zone || !root.contains(zone)) return;
        const selected = root.querySelector(pieceSelector + '.is-selected');
        if (!selected) return;
        event.preventDefault();
        options.onDrop(selected, zone, 'key');
      }

      root.addEventListener('pointerdown', onDown);
      root.addEventListener('pointerup', onRootUp);
      root.addEventListener('keydown', onKey);

      return function destroy() {
        root.removeEventListener('pointerdown', onDown);
        root.removeEventListener('pointerup', onRootUp);
        root.removeEventListener('keydown', onKey);
        removeGhost();
      };
    }
  };
})(window.PG = window.PG || {});
