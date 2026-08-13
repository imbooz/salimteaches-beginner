/*
 * SalimTeaches Beginner — Unit 3 integration
 *
 * Extends the existing index.js without changing the Worker or Unit 1/2
 * activity implementation.
 */
(function () {
  "use strict";

  function getUnit3() {
    return (courseData?.units || []).find(
      u => Number(u.unit_id) === 3
    ) || {
      unit_id: 3,
      sort_order: 3,
      title: "Jobs, Colours & To Be",
      description: "Jobs, colours, nationalities, days of the week va to be.",
      is_available: 1
    };
  }

  function findUnit3Activity(types, titleWords = []) {
    const activities = (courseData?.activities || [])
      .filter(a => Number(a.unit_id) === 3);

    for (const type of types) {
      const found = activities.find(a =>
        String(a.activity_type || "").toLowerCase() === type
      );
      if (found) return found;
    }

    if (titleWords.length) {
      return activities.find(a => {
        const title = String(a.title || "").toLowerCase();
        return titleWords.some(word => title.includes(word));
      }) || null;
    }

    return null;
  }

  function addUnit3Page() {
    if (document.getElementById("unit3Page")) return;

    const main = document.getElementById("main");
    if (!main) return;

    const page = document.createElement("div");
    page.id = "unit3Page";
    page.className = "page unit-page";

    page.innerHTML = `
      <div class="unit-page-header">
        <button class="back-button" onclick="closeUnit3()" aria-label="Orqaga">←</button>
        <div>
          <div class="unit-page-kicker">Unit 3</div>
          <h2>Jobs, Colours & To Be</h2>
        </div>
      </div>

      <div class="unit-progress-card">
        <div class="progress-row">
          <span class="progress-label">Unit jarayoni</span>
          <span class="progress-percent" id="unit3ProgressPercent">0%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="unit3ProgressFill" style="width:0%"></div>
        </div>
      </div>

      <div id="unit3Activities" class="activity-list"></div>

      <div id="unit3CompleteCard" class="unit-complete-card">
        🎉 Unit 3 tugallandi! Keyingi Unit ochildi.
      </div>
    `;

    main.appendChild(page);
  }

  function renderUnit3() {
    addUnit3Page();

    const unit = getUnit3();
    const container = document.getElementById("unit3Activities");
    if (!container) return;

    const progress = calculateProgress(unit);

    document.getElementById("unit3ProgressPercent").textContent =
      progress + "%";

    document.getElementById("unit3ProgressFill").style.width =
      progress + "%";

    const lesson = findUnit3Activity(
      ["lesson", "video"],
      ["dars", "lesson"]
    );

    const practice = findUnit3Activity(
      ["practice", "exercise"],
      ["mashq", "practice"]
    );

    const reading = findUnit3Activity(
      ["reading"],
      ["reading", "o‘qish", "oqish"]
    );

    const listening = findUnit3Activity(
      ["listening"],
      ["listening", "tinglash"]
    );

    const test = findUnit3Activity(
      ["test"],
      ["test"]
    );

    const lessonDone = activityIsComplete(lesson);
    const practiceDone = activityIsComplete(practice);
    const readingDone = activityIsComplete(reading);
    const listeningDone = activityIsComplete(listening);
    const testDone = activityIsComplete(test);

    const testAvailable =
      (!practice || practiceDone) &&
      (!reading || readingDone) &&
      (!listening || listeningDone);

    const items = [];

    items.push({
      icon: "🎥",
      title: "3-Dars",
      subtitle: "Jobs, colours, nationalities va to be darsini ko‘ring.",
      status: lesson
        ? (lessonDone ? "✓ Tugallangan" : "Boshlash →")
        : "Tez orada",
      done: lessonDone,
      locked: false,
      action: () => {
        if (!lesson) {
          tg.showAlert("Unit 3 darsi hali qo‘shilmagan.");
          return;
        }

        reportProgressFromApp(
          lesson.activity_id,
          true,
          null
        );

        if (lesson.video_id) {
          openVideo(lesson.video_id);
        } else if (lesson.youtube_id) {
          openVideo(lesson.youtube_id);
        } else {
          tg.showAlert("Unit 3 dars videosi hali biriktirilmagan.");
        }
      }
    });

    items.push({
      icon: "🧩",
      title: "Amaliy mashqlar",
      subtitle: "Unit 3 bo‘yicha 30 ta interaktiv savol.",
      status: practice
        ? (practiceDone ? "✓ Tugallangan" : "Boshlash →")
        : "Boshlash →",
      done: practiceDone,
      locked: false,
      action: () => {
        const url = practice
          ? `activities/unit3-practice.html?activity_id=${encodeURIComponent(
              practice.activity_id
            )}`
          : "activities/unit3-practice.html";

        window.location.href = url;
      }
    });

    if (reading) {
      items.push({
        icon: "📖",
        title: "Reading",
        subtitle: "Unit 3 reading activity.",
        status: readingDone ? "✓ Tugallangan" : "Boshlash →",
        done: readingDone,
        locked: false,
        action: () => {
          window.location.href =
            activityUrl("activities/unit3-reading.html", reading);
        }
      });
    }

    if (listening) {
      items.push({
        icon: "🎧",
        title: "Listening",
        subtitle: "Unit 3 listening activity.",
        status: listeningDone ? "✓ Tugallangan" : "Boshlash →",
        done: listeningDone,
        locked: false,
        action: () => {
          window.location.href =
            activityUrl("activities/unit3-listening.html", listening);
        }
      });
    }

    items.push({
      icon: "📝",
      title: "Unit 3 Test",
      subtitle: "Unitni tugatish uchun kamida 70% kerak.",
      status: testDone
        ? "✓ Tugallangan"
        : testAvailable
          ? (test ? "Boshlash →" : "Tez orada")
          : "🔒 Avval kerakli mashqlarni tugating",
      done: testDone,
      locked: !testAvailable,
      action: () => {
        if (!testAvailable) return;

        if (!test) {
          tg.showAlert("Unit 3 testi hali qo‘shilmagan.");
          return;
        }

        window.location.href =
          activityUrl("activities/unit3-test.html", test);
      }
    });

    container.innerHTML = "";

    items.forEach(item => {
      const button = document.createElement("button");

      button.type = "button";
      button.className =
        "activity-card" +
        (item.done ? " completed" : "") +
        (item.locked ? " locked" : "");

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

    const completeCard =
      document.getElementById("unit3CompleteCard");

    const unitProgress =
      (courseData?.unitProgress || {})[3];

    completeCard.style.display =
      unitProgress &&
      Number(unitProgress.completed) === 1
        ? "block"
        : "none";
  }

  function createUnit3Card() {
    const unit = getUnit3();

    const unit2Progress =
      courseData?.unitProgress?.[2];

    const unlocked =
      Boolean(
        unit2Progress &&
        Number(unit2Progress.completed) === 1
      );

    const unit3Progress =
      courseData?.unitProgress?.[3];

    const completed =
      Boolean(
        unit3Progress &&
        Number(unit3Progress.completed) === 1
      );

    const progress =
      calculateProgress(unit);

    const card = document.createElement("div");
    card.className =
      "unit-card" +
      (unlocked ? "" : " locked");

    const icon =
      completed
        ? "🏆"
        : unlocked
          ? "📖"
          : "🔒";

    const buttonText =
      completed
        ? "Qayta ko‘rish →"
        : unlocked
          ? "Davom etish →"
          : "Avval Unit 2 ni tugating";

    card.innerHTML = `
      <div class="unit-top">
        <div class="unit-icon">${icon}</div>

        <div class="unit-info">
          <div class="unit-number">Unit 3</div>
          <h3 class="unit-title">Jobs, Colours & To Be</h3>
          <p class="unit-description">
            Jobs, colours, nationalities, days of the week va to be.
          </p>
        </div>
      </div>

      ${
        unlocked
          ? `
            <div class="progress-area">
              <div class="progress-row">
                <span class="progress-label">Jarayon</span>
                <span class="progress-percent">${progress}%</span>
              </div>

              <div class="progress-bar">
                <div
                  class="progress-fill"
                  style="width:${progress}%"
                ></div>
              </div>
            </div>
          `
          : ""
      }

      ${
        completed
          ? `
            <div class="completed-badge">
              ✓ Tugallangan
            </div>
          `
          : ""
      }

      <button
        class="unit-button"
        ${unlocked ? 'onclick="openUnit(3)"' : "disabled"}
      >
        ${buttonText}
      </button>
    `;

    return card;
  }

  // Add Unit 3 to the existing Unit 1/2 unit lists.
  const originalRenderUnits = window.renderUnits;

  window.renderUnits = function () {
    originalRenderUnits();

    const unit3 = getUnit3();

    ["unitsContainer", "courseUnitsContainer"].forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;

      // index.js may already have rendered Unit 3 from courseData.
      // Replace that card with our Unit 3 card so its unlock state is
      // based on Unit 2 completion, not the backend is_available flag.
      const existing = [...container.children].find(card =>
        card.querySelector(".unit-number")?.textContent.trim() === "Unit 3"
      );

      const replacement = createUnit3Card();

      if (existing) {
        existing.replaceWith(replacement);
      } else {
        container.appendChild(replacement);
      }
    });

    const count = document.getElementById("unitCount");

    if (count) {
      const cards =
        document.querySelectorAll("#unitsContainer .unit-card").length;

      count.textContent = `${cards} ta Unit`;
    }
  };

  // Extend the existing openUnit() without changing Unit 1 or Unit 2.
  const originalOpenUnit = window.openUnit;

  window.openUnit = function (unitId) {
    if (Number(unitId) !== 3) {
      return originalOpenUnit(unitId);
    }

    const unit = getUnit3();

    // Unit 3 is unlocked by Unit 2 completion. Do not use the generic
    // getUnitStatus() here because its previous-unit lookup depends on the
    // backend unit metadata and can disagree with the menu card.
    const unit2Progress =
      courseData?.unitProgress?.[2];

    const unit3Unlocked =
      Boolean(
        unit2Progress &&
        Number(unit2Progress.completed) === 1
      );

    if (!unit3Unlocked) {
      tg.showAlert("Avval Unit 2 ni tugating.");
      return;
    }

    document
      .querySelectorAll(".page")
      .forEach(page => page.classList.remove("active"));

    addUnit3Page();

    document
      .getElementById("unit3Page")
      .classList.add("active");

    document
      .getElementById("bottomNav")
      .style.display = "none";

    renderUnit3();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  window.closeUnit3 = function () {
    const page = document.getElementById("unit3Page");

    if (page) {
      page.classList.remove("active");
    }

    document
      .getElementById("homePage")
      .classList.add("active");

    document
      .getElementById("bottomNav")
      .style.display = "flex";

    renderUnits();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  function initializeUnit3() {
    const main = document.getElementById("main");

    if (!main || main.style.display !== "block") {
      return;
    }

    addUnit3Page();
    renderUnits();

    const params = new URLSearchParams(window.location.search);

    if (
      params.get("unit") === "3" ||
      window.location.hash === "#unit3"
    ) {
      openUnit(3);
    }
  }

  // index.js authenticates asynchronously. Wait until its #main becomes
  // visible, then add Unit 3. This does not alter its authentication flow.
  const observer = new MutationObserver(() => {
    const main = document.getElementById("main");

    if (main && main.style.display === "block") {
      initializeUnit3();
      observer.disconnect();
    }
  });

  const main = document.getElementById("main");

  if (main) {
    observer.observe(
      main,
      {
        attributes: true,
        attributeFilter: ["style"]
      }
    );
  }

  initializeUnit3();
})();
