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
})();
