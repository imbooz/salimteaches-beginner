/*
 * SalimTeaches Beginner — display name + leaderboard
 *
 * Handles:
 *   - the first-run "what should we call you" prompt (skippable —
 *     Telegram names aren't reliable, so students set a separate
 *     display name used only for the leaderboard)
 *   - the editable name field on the Profile page
 *   - fetching and rendering the top-5 leaderboard on the home page
 *
 * Depends on globals from index.js: tg, currentUser, escapeHtml().
 * Called from index.js's showApplication() via initLeaderboardAndProfile().
 */

const LEADERBOARD_WORKER_BASE = "https://salimteaches-beginner-auth.imshosalim.workers.dev";


// ======================================================
// INIT
// ======================================================

function initLeaderboardAndProfile() {

  const profileInput = document.getElementById("profileNameInput");
  if (profileInput) {
    profileInput.value = currentUser?.display_name || "";
  }

  if (!currentUser?.display_name) {
    openNameModal();
  }

  loadLeaderboard();
}


// ======================================================
// NAME MODAL (first-run prompt, skippable)
// ======================================================

function openNameModal() {
  document.getElementById("nameInput").value = "";
  document.getElementById("nameError").textContent = "";
  document.getElementById("nameModal").classList.add("open");
}

function closeNameModal() {
  document.getElementById("nameModal").classList.remove("open");
}

function skipDisplayName() {
  closeNameModal();
}


// ======================================================
// SAVE DISPLAY NAME
//
// context: omitted -> the first-run modal
//          "profile" -> the Profile page field
// ======================================================

async function submitDisplayName(context) {

  const isProfile = context === "profile";

  const input = document.getElementById(
    isProfile ? "profileNameInput" : "nameInput"
  );

  const statusEl = document.getElementById(
    isProfile ? "profileNameStatus" : "nameError"
  );

  const name = (input.value || "").trim();

  if (!name) {
    statusEl.textContent = "Iltimos, ismingizni kiriting.";
    if (isProfile) statusEl.className = "profile-name-status err";
    return;
  }

  try {

    const response = await fetch(`${LEADERBOARD_WORKER_BASE}/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg.initData,
        display_name: name
      })
    });

    const data = await response.json();

    if (!data.success) {
      statusEl.textContent = data.error || "Saqlashda xatolik yuz berdi.";
      if (isProfile) statusEl.className = "profile-name-status err";
      return;
    }

    currentUser.display_name = data.display_name;

    // Keep both surfaces in sync regardless of which one was used to save.
    const profileInputEl = document.getElementById("profileNameInput");
    if (profileInputEl) profileInputEl.value = data.display_name;

    if (isProfile) {
      statusEl.textContent = "✓ Saqlandi.";
      statusEl.className = "profile-name-status ok";
    } else {
      closeNameModal();
    }

    loadLeaderboard();

  } catch (error) {
    console.error("Display name save failed:", error);
    statusEl.textContent = "Server bilan bog‘lanishda xatolik yuz berdi.";
    if (isProfile) statusEl.className = "profile-name-status err";
  }
}


// ======================================================
// LEADERBOARD
// ======================================================

async function loadLeaderboard() {

  const card = document.getElementById("leaderboardCard");

  if (!card || !tg.initData) return;

  try {

    const response = await fetch(`${LEADERBOARD_WORKER_BASE}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData })
    });

    const data = await response.json();

    if (!data.success) {
      card.style.display = "none";
      return;
    }

    renderLeaderboard(data.leaderboard || [], data.you || null);
    card.style.display = "block";

  } catch (error) {
    console.error("Leaderboard load failed:", error);
    card.style.display = "none";
  }
}

function leaderboardRankClass(rank) {
  if (rank === 1) return "top1";
  if (rank === 2) return "top2";
  if (rank === 3) return "top3";
  return "";
}

function leaderboardRankLabel(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function leaderboardRowHtml(row, isYou) {
  return `
    <div class="leaderboard-row${isYou ? " is-you" : ""}">
      <div class="leaderboard-rank ${leaderboardRankClass(row.rank)}">${leaderboardRankLabel(row.rank)}</div>
      <div class="leaderboard-name">${escapeHtml(row.name)}${isYou ? " (Siz)" : ""}</div>
      <div class="leaderboard-points">${row.points} ball</div>
    </div>
  `;
}

function renderLeaderboard(top5, you) {

  const list = document.getElementById("leaderboardList");
  const youPill = document.getElementById("leaderboardYouPill");

  if (!top5.length) {
    list.innerHTML = `<div class="leaderboard-empty">Hozircha reytingda hech kim yo‘q.</div>`;
  } else {

    const youInTop5 = Boolean(
      you && top5.some(row => row.telegramId === you.telegramId)
    );

    list.innerHTML =
      top5
        .map(row => leaderboardRowHtml(row, Boolean(you && row.telegramId === you.telegramId)))
        .join("") +
      (you && !youInTop5 ? leaderboardRowHtml(you, true) : "");
  }

  if (youPill) {
    youPill.textContent = you ? `Siz: #${you.rank}` : "";
  }
}
