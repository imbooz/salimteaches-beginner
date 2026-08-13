/*
 * SalimTeaches Beginner — shared mobile-friendly interactions.
 *
 * For Unit 3+ reorder/drop exercises:
 *   1. Tap an item.
 *   2. It becomes visibly selected.
 *   3. Tap the destination.
 *
 * Desktop drag-and-drop can still be layered on top by individual activities.
 *
 * Markup convention:
 *   .st-selectable[data-st-item]
 *   .st-drop-target[data-st-slot]
 *
 * When a selected item is placed, the custom event
 * "salimteaches:placed" is dispatched on the target.
 */
(function () {
  "use strict";

  let selected = null;

  function clearSelection() {
    if (selected) selected.classList.remove("is-selected");
    selected = null;
    document.querySelectorAll(".st-drop-target.is-active")
      .forEach(el => el.classList.remove("is-active"));
  }

  document.addEventListener("click", function (event) {
    const item = event.target.closest(".st-selectable[data-st-item]");
    if (item) {
      event.preventDefault();

      if (selected === item) {
        clearSelection();
        return;
      }

      clearSelection();
      selected = item;
      selected.classList.add("is-selected");

      document.querySelectorAll(".st-drop-target[data-st-slot]")
        .forEach(el => el.classList.add("is-active"));
      return;
    }

    const target = event.target.closest(".st-drop-target[data-st-slot]");
    if (target && selected) {
      event.preventDefault();

      target.dispatchEvent(new CustomEvent("salimteaches:placed", {
        bubbles: true,
        detail: { item: selected, slot: target.dataset.stSlot }
      }));

      clearSelection();
    }
  });

  window.SalimTeaches = window.SalimTeaches || {};
  window.SalimTeaches.clearSelection = clearSelection;
})();
