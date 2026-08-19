/*
 * SalimTeaches Beginner — UNIT ENGINE
 * =====================================
 * Generic. Do not hardcode a unit number in this file.
 * Reads UNIT_CONFIGS (units-config.js) + courseData (from index.js /
 * the Worker) and renders every unit's home-card and detail-page the
 * same way. Adding a new unit never requires editing this file.
 */

// ======================================================
// FIND A UNIT'S BACKEND ACTIVITY RECORD BY TYPE/TITLE
// ======================================================

function findBackendActivity(unitId, types, titleWords = []) {

  const activities =
    (courseData?.activities || [])
      .filter(a => Number(a.unit_id) === Number(unitId));

  for (const type of types) {
    const found = activities.find(a =>
      String(a.activity_type || "").toLowerCase() === type
    );
    if (found) return found;
  }

  if (titleWords.length) {
    const found = activities.find(a => {
      const title = String(a.title || "").toLowerCase();
      return titleWords.some(word => title.includes(word));
    });
    if (found) return found;
  }

  return null;
}


// ======================================================
// UNIT LOOKUP HELPERS
// ======================================================

function getConfiguredUnits() {
  return [...UNIT_CONFIGS].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

function getUnitConfig(unitId) {
  return UNIT_CONFIGS.find(
    u => Number(u.id) === Number(unitId)
  ) || null;
}

// Merge backend unit record (title/description/is_available/progress
// bookkeeping) with our local config (sortOrder, activities). Backend
// data wins for fields it provides; config fills in the rest so a unit
// still shows up even before the backend/database knows about it.
function getMergedUnit(unitId) {

  const config = getUnitConfig(unitId);
  if (!config) return null;

  const backend =
    (courseData?.units || []).find(
      u => Number(u.unit_id) === Number(unitId)
    );

  return {
    unit_id: unitId,
    sort_order: config.sortOrder,
    title: backend?.title || config.title,
    description: backend?.description || config.description,
    is_available:
      backend?.is_available !== undefined
        ? backend.is_available
        : 1
  };
}

function getAllMergedUnits() {
  return getConfiguredUnits().map(c => getMergedUnit(c.id));
}


// ======================================================
// UNLOCK / COMPLETION STATUS (same rule for every unit:
// the previous unit's test must be passed)
// ======================================================

function getUnitStatus(unit) {

  const progress =
    courseData?.unitProgress?.[unit.unit_id];

  const completed =
    Boolean(progress && progress.completed === 1);

  // First configured unit always starts unlocked (once published).
  const units = getAllMergedUnits();
  const isFirst =
    unit.sort_order === Math.min(...units.map(u => u.sort_order));

  if (isFirst) {
    return {
      unlocked: unit.is_available === 1,
      completed,
      progress
    };
  }

  const previousUnit =
    units.find(u => u.sort_order === unit.sort_order - 1);

  const previousProgress =
    previousUnit
      ? courseData?.unitProgress?.[previousUnit.unit_id]
      : null;

  const releasedByProgress =
    Boolean(previousProgress && previousProgress.completed === 1);

  // Deliberate: only the first unit depends on the backend's
  // is_available flag (that's how the course "opens"). Every unit
  // after that unlocks purely by finishing the previous one — a
  // teacher forgetting to flip is_available on Unit 3, 4, 5... should
  // never block a student who already earned their way there.
  return {
    unlocked: releasedByProgress,
    completed,
    progress
  };
}

function getLockedMessage(unit) {

  const units = getAllMergedUnits();

  const previousUnit =
    units.find(u => u.sort_order === unit.sort_order - 1);

  const previousProgress =
    previousUnit
      ? courseData?.unitProgress?.[previousUnit.unit_id]
      : null;

  if (previousProgress && previousProgress.completed !== 1) {
    return "Avval oldingi Unitni tugating";
  }

  return "Tez orada";
}


// ======================================================
// PROGRESS %
// ======================================================

function calculateProgress(unit) {

  const activities =
    (courseData?.activities || [])
      .filter(a =>
        a.unit_id === unit.unit_id &&
        a.is_required === 1
      );

  if (activities.length === 0) return 0;

  let completed = 0;

  activities.forEach(activity => {
    const progress =
      courseData?.activityProgress?.[activity.activity_id];

    if (progress && progress.completed === 1) completed++;
  });

  return Math.round((completed / activities.length) * 100);
}


// ======================================================
// HOME / COURSE PAGE — UNIT CARD (identical markup for every unit)
// ======================================================

function createUnitCard(unit) {

  const config = getUnitConfig(unit.unit_id);
  const status = getUnitStatus(unit);
  const progress = calculateProgress(unit);

  const card = document.createElement("div");
  card.className = "unit-card" + (status.unlocked ? "" : " locked");
  card.dataset.unitId = unit.unit_id;

  const icon =
    !status.unlocked ? "🔒" : status.completed ? "🏆" : (config?.icon || "📖");

  const kicker = config?.kicker || `Unit ${unit.unit_id}`;

  let buttonText;
  if (!status.unlocked) {
    buttonText = getLockedMessage(unit);
  } else if (status.completed) {
    buttonText = "Qayta ko‘rish →";
  } else {
    buttonText = "Davom etish →";
  }

  card.innerHTML = `
    <div class="unit-top">
      <div class="unit-icon">${icon}</div>
      <div class="unit-info">
        <div class="unit-number">${escapeHtml(kicker)}</div>
        <h3 class="unit-title">${escapeHtml(unit.title)}</h3>
        <p class="unit-description">${escapeHtml(unit.description || "")}</p>
      </div>
    </div>

    ${status.unlocked ? `
      <div class="progress-area">
        <div class="progress-row">
          <span class="progress-label">Jarayon</span>
          <span class="progress-percent">${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progress}%;"></div>
        </div>
      </div>
    ` : ""}

    ${status.completed && status.unlocked ? `
      <div class="completed-badge">✓ Tugallangan</div>
    ` : ""}

    <button class="unit-button" ${status.unlocked ? `onclick="openUnit(${unit.unit_id})"` : "disabled"}>
      ${buttonText}
    </button>
  `;

  return card;
}


// ======================================================
// RENDER ALL UNIT CARDS (home page + "Kursim" page)
// ======================================================

function renderUnits() {

  const units = getAllMergedUnits();

  document.getElementById("unitCount").textContent =
    `${units.length} ta Unit`;

  const homeContainer = document.getElementById("unitsContainer");
  const courseContainer = document.getElementById("courseUnitsContainer");

  homeContainer.innerHTML = "";
  courseContainer.innerHTML = "";

  units.forEach(unit => {
    homeContainer.appendChild(createUnitCard(unit));
    courseContainer.appendChild(createUnitCard(unit));
  });
}


// ======================================================
// UNIT DETAIL PAGE — DOM CREATION (once per unit, on demand)
// ======================================================

function ensureUnitPageDom(unitId) {

  const existing = document.getElementById(`unit${unitId}Page`);
  if (existing) return existing;

  const config = getUnitConfig(unitId);
  const main = document.getElementById("main");
  if (!config || !main) return null;

  const page = document.createElement("div");
  page.id = `unit${unitId}Page`;
  page.className = "page unit-page";

  page.innerHTML = `
    <div class="unit-page-header">
      <button class="back-button" onclick="closeUnit(${unitId})" aria-label="Orqaga">←</button>
      <div>
        <div class="unit-page-kicker">Unit ${unitId}</div>
        <h2>${escapeHtml(config.title)}</h2>
      </div>
    </div>

    <div class="unit-progress-card">
      <div class="progress-row">
        <span class="progress-label">Unit jarayoni</span>
        <span class="progress-percent" id="unit${unitId}ProgressPercent">0%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="unit${unitId}ProgressFill" style="width:0%"></div>
      </div>
    </div>

    <div id="unit${unitId}Activities" class="activity-list"></div>

    <div id="unit${unitId}CompleteCard" class="unit-complete-card">
      🎉 Unit ${unitId} tugallandi! Keyingi Unit ochildi.
    </div>
  `;

  main.appendChild(page);
  return page;
}


// ======================================================
// UNIT DETAIL PAGE — ACTIVITY LIST (identical logic for every unit)
// ======================================================

// "lesson" and "lesson2" (an optional second lesson-video card, e.g. a
// lesson split into Part 1 / Part 2) both behave like a lesson video:
// clicking opens the YouTube player and immediately reports completion.
function isLessonType(type) {
  return type === "lesson" || type === "lesson2";
}

function activityLookupFor(activityConfig) {

  const typeAliases = {
    lesson: ["lesson", "video"],
    // "lesson2" is an optional second lesson-video card (e.g. a lesson
    // split into Part 1 / Part 2). It needs its own DB activity_type
    // ("lesson2") so it doesn't collide with the first lesson's
    // backend row/completion state — see isLessonType() below.
    lesson2: ["lesson2"],
    workbook: ["workbook"],
    practice: ["practice", "exercise"],
    listening: ["listening"],
    reading: ["reading"],
    test: ["test"]
  };

  const titleWordAliases = {
    lesson: ["dars", "lesson"],
    lesson2: ["dars", "lesson"],
    workbook: ["workbook", "tahlil"],
    practice: ["mashq", "practice"],
    listening: ["listening", "tinglash"],
    reading: ["reading", "o‘qish", "oqish"],
    test: ["test"]
  };

  return {
    types: typeAliases[activityConfig.type] || [activityConfig.type],
    titleWords: titleWordAliases[activityConfig.type] || []
  };
}

function renderUnitDetail(unitId) {

  ensureUnitPageDom(unitId);

  const config = getUnitConfig(unitId);
  const container = document.getElementById(`unit${unitId}Activities`);
  if (!config || !container) return;

  const unit = getMergedUnit(unitId);
  const progress = calculateProgress(unit);

  document.getElementById(`unit${unitId}ProgressPercent`).textContent = progress + "%";
  document.getElementById(`unit${unitId}ProgressFill`).style.width = progress + "%";

  // Resolve each configured activity against the backend record (for
  // activity_id / completion tracking) — same lookup rule for every type.
  const resolved = {};
  config.activities.forEach(activityConfig => {
    const lookup = activityLookupFor(activityConfig);
    resolved[activityConfig.type] =
      findBackendActivity(unitId, lookup.types, lookup.titleWords);
  });

  const isDone = type => activityIsComplete(resolved[type]);

  const items = config.activities.map(activityConfig => {

    const backendActivity = resolved[activityConfig.type];
    const done = isDone(activityConfig.type);

    // Availability: an activity is locked only if it's a "test" type
    // with unmet "requires", or a linked exercise that has no backend
    // file registered yet.
    let locked = false;
    let status;

    if (isLessonType(activityConfig.type)) {
      status = done ? "✓ Tugallangan" : "Boshlash →";

    } else if (activityConfig.type === "workbook") {
      status = activityConfig.videoId ? "Ixtiyoriy" : "Tez orada";

    } else {
      const requires = activityConfig.requires || [];
      const requirementsMet = requires.every(
        type => !resolved[type] || isDone(type)
      );

      if (!requirementsMet) {
        locked = true;
        status = "🔒 Avval mashqlarni tugating";
      } else if (done) {
        status = "✓ Tugallangan";
      } else if (activityConfig.file) {
        status = "Boshlash →";
      } else {
        status = "Tez orada";
      }
    }

    return {
      icon: activityConfig.icon,
      title: activityConfig.title,
      subtitle: activityConfig.subtitle,
      status,
      done,
      locked,
      optional: activityConfig.type === "workbook",
      action: () => {

        if (locked) return;

        if (isLessonType(activityConfig.type)) {
          if (backendActivity) {
            reportProgressFromApp(backendActivity.activity_id, true, null);
          }
          openVideo(activityConfig.videoId);
          return;
        }

        if (activityConfig.type === "workbook") {
          if (!activityConfig.videoId) {
            tg.showAlert("Workbook tahlili videosi tez orada qo‘shiladi.");
            return;
          }
          openVideo(activityConfig.videoId);
          return;
        }

        if (!activityConfig.file) {
          tg.showAlert(`Unit ${unitId} ${activityConfig.title} hali qo‘shilmagan.`);
          return;
        }

        window.location.href =
          activityUrl(`activities/${activityConfig.file}`, backendActivity);
      }
    };
  });

  container.innerHTML = "";

  items.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "activity-card" +
      (item.done ? " completed" : "") +
      (item.locked ? " locked" : "") +
      (item.optional ? " optional" : "");

    button.innerHTML = `
      <div class="activity-icon">${item.icon}</div>
      <div class="activity-main">
        <div class="activity-title">${escapeHtml(item.title)}</div>
        <div class="activity-subtitle">${escapeHtml(item.subtitle)}</div>
      </div>
      <div class="activity-status">${escapeHtml(item.status)}</div>
    `;

    if (!item.locked) {
      button.addEventListener("click", item.action);
    }

    container.appendChild(button);
  });

  const completeCard = document.getElementById(`unit${unitId}CompleteCard`);
  const unitProgress = (courseData?.unitProgress || {})[unitId];

  completeCard.style.display =
    unitProgress && Number(unitProgress.completed) === 1 ? "block" : "none";
}


// ======================================================
// OPEN / CLOSE (identical for every unit)
// ======================================================

function openUnit(unitId) {

  const unit = getMergedUnit(unitId);
  if (!unit) {
    tg.showAlert("Bu Unit hali tayyorlanmoqda.");
    return;
  }

  const status = getUnitStatus(unit);
  if (!status.unlocked) {
    tg.showAlert("Avval oldingi Unitni tugating.");
    return;
  }

  // Milestones (progress tests) have no detail page — tapping the card
  // goes straight into their single "test" activity.
  const config = getUnitConfig(unitId);
  if (config?.milestone) {
    const activityConfig = config.activities[0];
    if (!activityConfig?.file) {
      tg.showAlert("Bu test hali tayyorlanmoqda.");
      return;
    }
    const lookup = activityLookupFor(activityConfig);
    const backendActivity = findBackendActivity(unitId, lookup.types, lookup.titleWords);
    window.location.href =
      activityUrl(`activities/${activityConfig.file}`, backendActivity);
    return;
  }

  document.querySelectorAll(".page").forEach(page =>
    page.classList.remove("active")
  );

  ensureUnitPageDom(unitId);

  document.getElementById(`unit${unitId}Page`).classList.add("active");
  document.getElementById("bottomNav").style.display = "none";

  renderUnitDetail(unitId);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeUnit(unitId) {

  document.getElementById(`unit${unitId}Page`)?.classList.remove("active");
  document.getElementById("homePage").classList.add("active");
  document.getElementById("bottomNav").style.display = "flex";

  renderUnits();
  window.scrollTo({ top: 0, behavior: "smooth" });
}


// ======================================================
// DEEP LINK ON LOAD (?unit=3 or #unit3)
// ======================================================

function openUnitFromLocation() {

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("unit");
  const fromHash = window.location.hash.match(/^#unit(\d+)$/);

  const unitId =
    fromQuery ? Number(fromQuery) :
    fromHash ? Number(fromHash[1]) :
    null;

  if (unitId) openUnit(unitId);
}
