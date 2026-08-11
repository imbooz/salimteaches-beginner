/*
 * SalimTeaches Beginner — shared Unit 3+ progress client.
 *
 * Backend remains in Cloudflare. This file only calls the existing Worker.
 */
(function () {
  "use strict";

  const WORKER_BASE =
    "https://salimteaches-beginner-auth.imshosalim.workers.dev";

  function getTelegramInitData() {
    const tg = window.Telegram?.WebApp;
    return tg?.initData || "";
  }

  async function reportActivityProgress(activityId, completed, score = null) {
    const initData = getTelegramInitData();
    if (!initData) {
      throw new Error("Telegram initData mavjud emas.");
    }

    const response = await fetch(`${WORKER_BASE}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData,
        activity_id: Number(activityId),
        completed: Boolean(completed),
        score:
          score === null || score === undefined || score === ""
            ? null
            : Number(score)
      })
    });

    if (!response.ok) {
      throw new Error(`Progress saqlanmadi (${response.status}).`);
    }

    return response.json();
  }

  window.SalimTeaches = window.SalimTeaches || {};
  window.SalimTeaches.getTelegramInitData = getTelegramInitData;
  window.SalimTeaches.reportActivityProgress = reportActivityProgress;
})();
