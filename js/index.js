/*
 * SalimTeaches Beginner — app shell
 *
 * Handles Telegram auth, navigation, video modal, and progress reporting.
 * Everything unit-specific lives in units-config.js (content) and
 * unit-engine.js (rendering) — this file never mentions a unit number.
 */

// ======================================================
// TELEGRAM
// ======================================================

const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();

// Keep Telegram initData available when an activity page opens.
// Activity pages are same-origin, so sessionStorage lets them
// authenticate with the same Cloudflare Worker without putting
// sensitive initData into the URL.
if (tg.initData) {
  sessionStorage.setItem("salimteaches_initData", tg.initData);
}

sessionStorage.setItem(
  "salimteaches_returnUrl",
  window.location.href.split("#")[0]
);


// ======================================================
// GLOBAL DATA
// ======================================================

let courseData = null;
let currentUser = null;

const WORKER_BASE = "https://salimteaches-beginner-auth.imshosalim.workers.dev";


// ======================================================
// AUTHENTICATION
// ======================================================

async function authenticate() {

  const initData = tg.initData;

  if (!initData) {
    showError("Mini App Telegram ichidan ochilmagan.");
    return;
  }

  try {

    const response = await fetch(`${WORKER_BASE}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData })
    });

    const data = await response.json();

    if (data.authorized) {
      currentUser = data.user;
      courseData = data.course;
      showApplication();
    } else {
      showError(getErrorMessage(data));
    }

  } catch (error) {
    console.error(error);
    showError("Server bilan bog‘lanishda xatolik yuz berdi.");
  }
}


function getErrorMessage(data) {

  if (data.reason === "not_member") {
    return "Siz Premium guruh a'zosi emassiz.";
  }

  if (data.reason === "telegram_auth_failed") {
    return "Telegram orqali autentifikatsiya amalga oshmadi.";
  }

  return "Kirishni tasdiqlashda xatolik yuz berdi.";
}


// ======================================================
// SHOW APPLICATION
// ======================================================

function showApplication() {

  document.getElementById("loading").style.display = "none";
  document.getElementById("main").style.display = "block";
  document.getElementById("bottomNav").style.display = "flex";

  renderUser();
  renderUnits();       // unit-engine.js
  openUnitFromLocation(); // unit-engine.js
}


// ======================================================
// USER
// ======================================================

function renderUser() {

  const name = currentUser?.first_name || "Student";

  document.getElementById("welcomeName").textContent = name;
  document.getElementById("profileName").textContent = name;

  const username = currentUser?.username;
  document.getElementById("profileUsername").textContent =
    username ? "@" + username : "Telegram foydalanuvchisi";

  document.getElementById("profileAvatar").textContent =
    name.charAt(0).toUpperCase();
}


// ======================================================
// ACTIVITY HELPERS (generic — used by unit-engine.js)
// ======================================================

function activityIsComplete(activity) {

  if (!activity) return false;

  const progress = courseData?.activityProgress?.[activity.activity_id];

  return Boolean(progress && Number(progress.completed) === 1);
}

function activityUrl(file, activity) {

  if (!activity) return file;

  return file + "?activity_id=" + encodeURIComponent(activity.activity_id);
}


// ======================================================
// PROGRESS REPORTING
// ======================================================

async function reportProgressFromApp(activityId, completed, score) {

  if (!activityId) return null;

  try {

    const response = await fetch(`${WORKER_BASE}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: tg.initData,
        activity_id: Number(activityId),
        completed: Boolean(completed),
        score: score === null || score === undefined ? null : Number(score)
      })
    });

    const data = await response.json();

    if (data.course) {
      courseData = data.course;
    }

    return data;

  } catch (error) {
    console.error("Progress save failed:", error);
    return null;
  }
}


// ======================================================
// VIDEO MODAL
// ======================================================

function openVideo(videoId) {

  const frame = document.getElementById("videoFrame");
  frame.src = "https://www.youtube.com/embed/" + videoId + "?rel=0";

  document.getElementById("videoModal").classList.add("open");
}

function closeVideo() {

  document.getElementById("videoFrame").src = "";
  document.getElementById("videoModal").classList.remove("open");
}


// ======================================================
// BOTTOM NAV PAGES (home / course / profile)
// ======================================================

function showPage(page) {

  const pages = {
    home: document.getElementById("homePage"),
    course: document.getElementById("coursePage"),
    profile: document.getElementById("profilePage")
  };

  Object.values(pages).forEach(el => el.classList.remove("active"));
  pages[page].classList.add("active");

  const buttons = document.querySelectorAll(".nav-button");
  buttons.forEach(button => button.classList.remove("active"));

  const index = { home: 0, course: 1, profile: 2 }[page];
  buttons[index].classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}


// ======================================================
// UTIL
// ======================================================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {

  document.getElementById("loading").style.display = "none";
  document.getElementById("errorScreen").style.display = "flex";
  document.getElementById("errorMessage").textContent = message;
}


// ======================================================
// START
// ======================================================

authenticate();
