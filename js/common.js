/*
 * SalimTeaches Beginner — shared Unit 3+ utilities.
 */
(function () {
  "use strict";

  window.SalimTeaches = window.SalimTeaches || {};

  window.SalimTeaches.normalizeAnswer = function (value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  };

  window.SalimTeaches.goTo = function (url) {
    window.location.href = url;
  };

  // ----------------------------------------------------------
  // POST-CHECK ACTIONS
  //
  // Call this once an activity has been checked/scored, in place
  // of leaving the old "Check answers" button on screen. It swaps
  // that button for a "← Ortga qaytish" / "🔁 Qayta ishlash" pair.
  //
  // Self-contained styling (injected once) so it looks identical on
  // every activity page, regardless of that page's own legacy CSS.
  //
  //   checkButtonId — id of the existing check/submit button
  //   backUnitId    — which unit's home page "Ortga qaytish" returns to.
  //                   Omit (or pass a falsy value) to go straight to the
  //                   app's home page instead of a unit page — use this
  //                   for milestone/progress-test pages, which have no
  //                   detail page of their own to go back to.
  // ----------------------------------------------------------

  const POSTCHECK_STYLE_ID = "st-postcheck-style";

  function injectPostCheckStyles() {
    if (document.getElementById(POSTCHECK_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = POSTCHECK_STYLE_ID;
    style.textContent = `
      .st-postcheck-actions{display:flex;gap:10px;width:100%}
      .st-postcheck-btn{
        flex:1;min-width:0;border:0;border-radius:13px;padding:15px 18px;
        font-size:16px;font-weight:700;cursor:pointer;touch-action:manipulation;
        display:flex;align-items:center;justify-content:center;gap:7px;
        font-family:inherit;
      }
      .st-postcheck-btn:active{transform:scale(.98)}
      .st-postcheck-back{background:#e9ebf4;color:#252b40}
      .st-postcheck-retry{background:#5865f2;color:#fff}
    `;
    document.head.appendChild(style);
  }

  window.SalimTeaches.showPostCheckActions = function (checkButtonId, backUnitId) {

    const checkBtn = document.getElementById(checkButtonId);
    if (!checkBtn) return;

    injectPostCheckStyles();

    const wrap = document.createElement("div");
    wrap.className = "st-postcheck-actions";
    wrap.innerHTML = `
      <button type="button" class="st-postcheck-btn st-postcheck-back">← Ortga qaytish</button>
      <button type="button" class="st-postcheck-btn st-postcheck-retry">🔁 Qayta ishlash</button>
    `;

    checkBtn.replaceWith(wrap);

    wrap.querySelector(".st-postcheck-back").addEventListener("click", function () {
      window.location.href = backUnitId
        ? "https://imbooz.github.io/salimteaches-beginner/index.html?unit=" + backUnitId
        : "https://imbooz.github.io/salimteaches-beginner/index.html";
    });

    wrap.querySelector(".st-postcheck-retry").addEventListener("click", function () {
      window.location.reload();
    });
  };
})();
