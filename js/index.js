/*
 * SalimTeaches Beginner — index application
 *
 * v1 migration: existing index.html application logic moved here unchanged.
 * Cloudflare Worker/D1 contract is unchanged.
 */
// ======================================================
    // TELEGRAM
    // ======================================================

    const tg =
      window.Telegram.WebApp;

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


    // ======================================================
    // AUTHENTICATION
    // ======================================================

    async function authenticate() {

      const initData =
        tg.initData;


      if (!initData) {

        showError(
          "Mini App Telegram ichidan ochilmagan."
        );

        return;

      }


      try {

        const response =
          await fetch(
            "https://salimteaches-beginner-auth.imshosalim.workers.dev/auth",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                initData
              })
            }
          );


        const data =
          await response.json();


        if (
          data.authorized
        ) {

          currentUser =
            data.user;

          courseData =
            data.course;


          showApplication();

        } else {

          showError(
            getErrorMessage(data)
          );

        }


      } catch (error) {

        console.error(error);

        showError(
          "Server bilan bog‘lanishda xatolik yuz berdi."
        );

      }

    }


    // ======================================================
    // ERROR MESSAGE
    // ======================================================

    function getErrorMessage(data) {

      if (
        data.reason ===
        "not_member"
      ) {

        return (
          "Siz Premium guruh a'zosi emassiz."
        );

      }


      if (
        data.reason ===
        "telegram_auth_failed"
      ) {

        return (
          "Telegram orqali autentifikatsiya amalga oshmadi."
        );

      }


      return (
        "Kirishni tasdiqlashda xatolik yuz berdi."
      );

    }


    // ======================================================
    // SHOW APPLICATION
    // ======================================================

    function showApplication() {

      document
        .getElementById("loading")
        .style.display = "none";


      document
        .getElementById("main")
        .style.display = "block";


      document
        .getElementById("bottomNav")
        .style.display = "flex";


      renderUser();

      renderUnits();

      const params = new URLSearchParams(window.location.search);
      if (
        params.get("unit") === "1" ||
        window.location.hash === "#unit1"
      ) {
        openUnit(1);
      } else if (
        params.get("unit") === "2" ||
        window.location.hash === "#unit2"
      ) {
        openUnit(2);
      }

    }


    // ======================================================
    // USER
    // ======================================================

    function renderUser() {

      const name =
        currentUser?.first_name ||
        "Student";


      document
        .getElementById("welcomeName")
        .textContent =
          name;


      document
        .getElementById("profileName")
        .textContent =
          name;


      const username =
        currentUser?.username;


      document
        .getElementById("profileUsername")
        .textContent =
          username
            ? "@" + username
            : "Telegram foydalanuvchisi";


      const firstLetter =
        name
          .charAt(0)
          .toUpperCase();


      document
        .getElementById("profileAvatar")
        .textContent =
          firstLetter;

    }


    // ======================================================
    // RENDER UNITS
    // ======================================================

    function renderUnits() {

      const units =
        [...(courseData?.units || [])];

      // Unit 2 is shown on the course home immediately, but its
      // status is controlled by completion of Unit 1. The backend
      // can later provide the full Unit 2 record without changing
      // this front-end logic.
      if (
        !units.some(u => Number(u.unit_id) === 2)
      ) {
        units.push({
          unit_id: 2,
          sort_order: 2,
          title: "Hotels & Cafés",
          description: "Mehmonxona va kafeda muloqot qilish."
        });
      }

      units.sort(
        (a, b) =>
          Number(a.sort_order || a.unit_id) -
          Number(b.sort_order || b.unit_id)
      );


      document
        .getElementById("unitCount")
        .textContent =
          `${units.length} ta Unit`;


      const homeContainer =
        document
          .getElementById(
            "unitsContainer"
          );


      const courseContainer =
        document
          .getElementById(
            "courseUnitsContainer"
          );


      homeContainer.innerHTML = "";

      courseContainer.innerHTML = "";


      units.forEach(
        unit => {

          const homeCard =
            createUnitCard(unit);


          const courseCard =
            createUnitCard(unit);


          homeContainer
            .appendChild(
              homeCard
            );


          courseContainer
            .appendChild(
              courseCard
            );

        }
      );

    }


    // ======================================================
    // UNIT STATUS
    // ======================================================

    function getUnitStatus(unit) {

      const progress =
        courseData?.unitProgress?.[
          unit.unit_id
        ];


      const completed =
        progress &&
        progress.completed === 1;


      // Unit 1 starts unlocked.
      if (
        unit.unit_id === 1
      ) {

        return {
          unlocked:
            unit.is_available === 1,

          completed,

          progress

        };

      }


      // Find previous unit.
      const previousUnit =
        courseData.units.find(
          u =>
            u.sort_order ===
            unit.sort_order - 1
        ) ||
        (
          Number(unit.unit_id) === 2
            ? {
                unit_id: 1,
                sort_order: 1
              }
            : null
        );


      const previousProgress =
        previousUnit
          ? courseData
              ?.unitProgress?.[
                previousUnit.unit_id
              ]
          : null;


      // Unit 2 is released by completing Unit 1.
      // We intentionally do not depend on the backend's is_available
      // flag for Unit 2, because the student-facing progression is
      // controlled by the previous Unit's completion.
      const releasedByProgress =
        previousProgress &&
        previousProgress.completed === 1;

      const unlocked =
        Number(unit.unit_id) === 2
          ? Boolean(releasedByProgress)
          : (
              (
                unit.is_available === undefined ||
                unit.is_available === 1
              ) &&
              Boolean(releasedByProgress)
            );


      return {
        unlocked: Boolean(unlocked),
        completed,
        progress
      };

    }


    // ======================================================
    // CALCULATE UNIT PROGRESS
    // ======================================================

    function calculateProgress(unit) {

      const activities =
        courseData?.activities
          ?.filter(
            activity =>
              activity.unit_id ===
              unit.unit_id &&
              activity.is_required === 1
          ) || [];


      if (
        activities.length === 0
      ) {

        return 0;

      }


      let completed = 0;


      activities.forEach(
        activity => {

          const progress =
            courseData
              ?.activityProgress?.[
                activity.activity_id
              ];


          if (
            progress &&
            progress.completed === 1
          ) {

            completed++;

          }

        }
      );


      return Math.round(
        (
          completed /
          activities.length
        ) * 100
      );

    }


    // ======================================================
    // UNIT CARD
    // ======================================================

    function createUnitCard(unit) {

      const status =
        getUnitStatus(unit);


      const progress =
        calculateProgress(unit);


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "unit-card" +
        (
          status.unlocked
            ? ""
            : " locked"
        );


      const icon =
        status.completed
          ? "🏆"
          : status.unlocked
            ? "📖"
            : "🔒";


      let buttonText;


      if (
        status.completed
      ) {

        buttonText =
          "Qayta ko‘rish →";

      } else if (
        status.unlocked
      ) {

        buttonText =
          "Davom etish →";

      } else {

        buttonText =
          getLockedMessage(unit);

      }


      card.innerHTML = `

        <div class="unit-top">

          <div class="unit-icon">
            ${icon}
          </div>

          <div class="unit-info">

            <div class="unit-number">
              Unit ${unit.unit_id}
            </div>

            <h3 class="unit-title">
              ${escapeHtml(
                unit.title
              )}
            </h3>

            <p class="unit-description">
              ${escapeHtml(
                unit.description ||
                ""
              )}
            </p>

          </div>

        </div>


        ${
          status.unlocked
            ? `

              <div class="progress-area">

                <div class="progress-row">

                  <span class="progress-label">
                    Jarayon
                  </span>

                  <span class="progress-percent">
                    ${progress}%
                  </span>

                </div>

                <div class="progress-bar">

                  <div
                    class="progress-fill"
                    style="
                      width:${progress}%;
                    "
                  ></div>

                </div>

              </div>

            `
            : ""
        }


        ${
          status.completed
            ? `

              <div class="completed-badge">
                ✓ Tugallangan
              </div>

            `
            : ""
        }


        <button
          class="unit-button"
          ${
            status.unlocked
              ? `onclick="openUnit(${unit.unit_id})"`
              : "disabled"
          }
        >
          ${buttonText}
        </button>

      `;


      return card;

    }


    // ======================================================
    // LOCK MESSAGE
    // ======================================================

    function getLockedMessage(unit) {

      const previousUnit =
        courseData?.units?.find(
          u => Number(u.sort_order) === Number(unit.sort_order) - 1
        );

      const previousProgress =
        previousUnit
          ? courseData?.unitProgress?.[previousUnit.unit_id]
          : null;

      if (
        previousProgress &&
        previousProgress.completed !== 1
      ) {
        return "Avval oldingi Unitni tugating";
      }

      return "Tez orada";

    }


    // ======================================================
    // OPEN UNIT
    // ======================================================

    function openUnit(unitId) {

      const unit =
        (courseData?.units || [])
          .find(u => Number(u.unit_id) === Number(unitId));

      const fallbackUnit =
        unitId === 2
          ? {
              unit_id: 2,
              sort_order: 2,
              title: "Hotels & Cafés",
              description: "Mehmonxona va kafeda muloqot qilish."
            }
          : null;

      const selectedUnit = unit || fallbackUnit;

      if (!selectedUnit) {
        tg.showAlert("Bu Unit hali tayyorlanmoqda.");
        return;
      }

      const status = getUnitStatus(selectedUnit);

      if (!status.unlocked) {
        tg.showAlert(
          unitId === 2
            ? "Avval Unit 1 ni tugating."
            : "Bu Unit hali ochilmagan."
        );
        return;
      }

      document
        .querySelectorAll(".page")
        .forEach(page =>
          page.classList.remove("active")
        );

      if (Number(unitId) === 1) {
        document
          .getElementById("unit1Page")
          .classList.add("active");

        document
          .getElementById("bottomNav")
          .style.display = "none";

        renderUnit1();
      }

      if (Number(unitId) === 2) {
        document
          .getElementById("unit2Page")
          .classList.add("active");

        document
          .getElementById("bottomNav")
          .style.display = "none";

        renderUnit2();
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }


    function closeUnit1() {
      closeUnitPage("unit1Page");
    }


    function closeUnit2() {
      closeUnitPage("unit2Page");
    }


    function closeUnitPage(pageId) {

      document
        .getElementById(pageId)
        .classList.remove("active");

      document
        .getElementById("homePage")
        .classList.add("active");

      document
        .getElementById("bottomNav")
        .style.display = "flex";

      renderUnits();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }


    function findUnit1Activity(types, titleWords = []) {

      const activities =
        (courseData?.activities || [])
          .filter(a => Number(a.unit_id) === 1);

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


    function activityIsComplete(activity) {

      if (!activity) return false;

      const progress =
        courseData?.activityProgress?.[
          activity.activity_id
        ];

      return Boolean(
        progress &&
        Number(progress.completed) === 1
      );
    }


    function activityUrl(file, activity) {

      if (!activity) return file;

      return (
        file +
        "?activity_id=" +
        encodeURIComponent(activity.activity_id)
      );
    }


    function renderUnit1() {

      const container =
        document.getElementById("unit1Activities");

      const requiredActivities =
        (courseData?.activities || [])
          .filter(a =>
            Number(a.unit_id) === 1 &&
            Number(a.is_required) === 1
          );

      const unit1 =
        (courseData?.units || [])
          .find(u => Number(u.unit_id) === 1);

      const progress =
        unit1
          ? calculateProgress(unit1)
          : 0;

      document.getElementById("unit1ProgressPercent")
        .textContent = progress + "%";

      document.getElementById("unit1ProgressFill")
        .style.width = progress + "%";

      const lesson =
        findUnit1Activity(
          ["lesson", "video"],
          ["dars", "lesson"]
        );

      const practice =
        findUnit1Activity(
          ["practice", "exercise"],
          ["mashq", "practice"]
        );

      const listening =
        findUnit1Activity(
          ["listening"],
          ["listening", "tinglash"]
        );

      const test =
        findUnit1Activity(
          ["test"],
          ["test"]
        );

      const lessonDone = activityIsComplete(lesson);
      const practiceDone = activityIsComplete(practice);
      const listeningDone = activityIsComplete(listening);
      const testDone = activityIsComplete(test);

      const practiceAvailable =
        !practice ||
        true;

      const listeningAvailable =
        !listening ||
        true;

      const testAvailable =
        (!practice || practiceDone) &&
        (!listening || listeningDone);

      const items = [];

      items.push({
        icon: "🎥",
        title: "1-Dars",
        subtitle: "Greetings & Introductions darsini ko‘ring.",
        status: lessonDone ? "✓ Tugallangan" : "Boshlash →",
        done: lessonDone,
        locked: false,
        action: () => {
          if (lesson) {
            reportProgressFromApp(
              lesson.activity_id,
              true,
              null
            );
          }
          openVideo("Kd7X6tKh6YA");
        }
      });


      items.push({
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling.",
        status: "Ixtiyoriy",
        done: false,
        optional: true,
        locked: false,
        action: () => openVideo("bj9rjwICNqU")
      });

      items.push({
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 1 bo‘yicha interaktiv mashqlar.",
        status: practiceDone ? "✓ Tugallangan" : "Boshlash →",
        done: practiceDone,
        locked: false,
        action: () => {
          window.location.href =
            activityUrl(
              "activities/unit1-practice.html",
              practice
            );
        }
      });

      items.push({
        icon: "🎧",
        title: "Listening",
        subtitle: "3 ta dialog va 14 ta savol.",
        status: listeningDone ? "✓ Tugallangan" : "Boshlash →",
        done: listeningDone,
        locked: false,
        action: () => {
          window.location.href =
            activityUrl(
              "activities/unit1-listening.html",
              listening
            );
        }
      });

      items.push({
        icon: "📝",
        title: "Unit 1 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        status: testDone
          ? "✓ Tugallangan"
          : testAvailable
            ? "Boshlash →"
            : "🔒 Avval mashqlarni tugating",
        done: testDone,
        locked: !testAvailable,
        action: () => {
          if (!testAvailable) return;
          window.location.href =
            activityUrl(
              "activities/unit1-test.html",
              test
            );
        }
      });

      container.innerHTML = "";

      items.forEach(item => {

        const button =
          document.createElement("button");

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

      const completeCard =
        document.getElementById("unit1CompleteCard");

      const unitProgress =
        (courseData?.unitProgress || {})[1];

      completeCard.style.display =
        unitProgress &&
        Number(unitProgress.completed) === 1
          ? "block"
          : "none";
    }


    function findUnit2Activity(types, titleWords = []) {

      const activities =
        (courseData?.activities || [])
          .filter(a => Number(a.unit_id) === 2);

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


    function renderUnit2() {

      const container =
        document.getElementById("unit2Activities");

      const unit2 =
        (courseData?.units || [])
          .find(u => Number(u.unit_id) === 2) ||
          {
            unit_id: 2,
            sort_order: 2,
            title: "Hotels & Cafés"
          };

      const progress = calculateProgress(unit2);

      document.getElementById("unit2ProgressPercent")
        .textContent = progress + "%";

      document.getElementById("unit2ProgressFill")
        .style.width = progress + "%";

      const lesson =
        findUnit2Activity(
          ["lesson", "video"],
          ["dars", "lesson"]
        );

      const practice =
        findUnit2Activity(
          ["practice", "exercise"],
          ["mashq", "practice"]
        );

      const reading =
        findUnit2Activity(
          ["reading"],
          ["reading", "o‘qish", "oqish"]
        );

      const test =
        findUnit2Activity(
          ["test"],
          ["test"]
        );

      const lessonDone = activityIsComplete(lesson);
      const practiceDone = activityIsComplete(practice);
      const readingDone = activityIsComplete(reading);
      const testDone = activityIsComplete(test);

      const testAvailable =
        (!practice || practiceDone) &&
        (!reading || readingDone);

      const items = [];

      items.push({
        icon: "🎥",
        title: "2-Dars",
        subtitle: "Unit 2 darsini ko‘ring.",
        status: lesson
          ? (lessonDone ? "✓ Tugallangan" : "Boshlash →")
          : "Boshlash →",
        done: lessonDone,
        locked: false,
        action: () => {
          if (lesson) {
            reportProgressFromApp(
              lesson.activity_id,
              true,
              null
            );
          }
          openVideo("WPGTM1Mb0JY");
        }
      });

      items.push({
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling.",
        status: "Ixtiyoriy",
        done: false,
        optional: true,
        locked: false,
        action: () => openVideo("JSmGBHUKyrs")
      });

      items.push({
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 2 bo‘yicha interaktiv mashqlar.",
        status: practice
          ? (practiceDone ? "✓ Tugallangan" : "Boshlash →")
          : "Tez orada",
        done: practiceDone,
        locked: false,
        action: () => {
          if (!practice) {
            tg.showAlert("Unit 2 amaliy mashqlari hali qo‘shilmagan.");
            return;
          }
          window.location.href =
            activityUrl(
              "activities/unit2-practice.html",
              practice
            );
        }
      });

      items.push({
        icon: "📖",
        title: "Reading",
        subtitle: "3 ta matn va turli xil mashqlar.",
        status: reading
          ? (readingDone ? "✓ Tugallangan" : "Boshlash →")
          : "Tez orada",
        done: readingDone,
        locked: false,
        action: () => {
          if (!reading) {
            tg.showAlert("Unit 2 Reading hali qo‘shilmagan.");
            return;
          }
          window.location.href =
            activityUrl(
              "activities/unit2-reading.html",
              reading
            );
        }
      });

      items.push({
        icon: "📝",
        title: "Unit 2 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        status: testDone
          ? "✓ Tugallangan"
          : testAvailable
            ? (test ? "Boshlash →" : "Tez orada")
            : "🔒 Avval mashqlarni tugating",
        done: testDone,
        locked: !testAvailable,
        action: () => {
          if (!testAvailable) return;
          if (!test) {
            tg.showAlert("Unit 2 testi hali qo‘shilmagan.");
            return;
          }
          window.location.href =
            activityUrl(
              "activities/unit2-test.html",
              test
            );
        }
      });

      container.innerHTML = "";

      items.forEach(item => {
        const button =
          document.createElement("button");

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
        document.getElementById("unit2CompleteCard");

      const unitProgress =
        (courseData?.unitProgress || {})[2];

      completeCard.style.display =
        unitProgress &&
        Number(unitProgress.completed) === 1
          ? "block"
          : "none";
    }


    async function reportProgressFromApp(
      activityId,
      completed,
      score
    ) {

      if (!activityId) return null;

      try {

        const response =
          await fetch(
            "https://salimteaches-beginner-auth.imshosalim.workers.dev/progress",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                initData: tg.initData,
                activity_id: Number(activityId),
                completed: Boolean(completed),
                score:
                  score === null ||
                  score === undefined
                    ? null
                    : Number(score)
              })
            }
          );

        const data =
          await response.json();

        if (data.course) {
          courseData = data.course;
        }

        return data;

      } catch (error) {
        console.error("Progress save failed:", error);
        return null;
      }
    }


    function openVideo(videoId) {

      const frame =
        document.getElementById("videoFrame");

      frame.src =
        "https://www.youtube.com/embed/" +
        videoId +
        "?rel=0";

      document
        .getElementById("videoModal")
        .classList.add("open");

    }


    function closeVideo() {

      const modal =
        document.getElementById("videoModal");

      document
        .getElementById("videoFrame")
        .src = "";

      modal.classList.remove("open");

    }


    // ======================================================
    // NAVIGATION
    // ======================================================

    function showPage(page) {

      const pages = {

        home:
          document.getElementById(
            "homePage"
          ),

        course:
          document.getElementById(
            "coursePage"
          ),

        profile:
          document.getElementById(
            "profilePage"
          )

      };


      Object.values(pages)
        .forEach(
          element =>
            element.classList.remove(
              "active"
            )
        );


      pages[page]
        .classList.add(
          "active"
        );


      const buttons =
        document.querySelectorAll(
          ".nav-button"
        );


      buttons.forEach(
        button =>
          button.classList.remove(
            "active"
          )
      );


      const index = {

        home: 0,
        course: 1,
        profile: 2

      }[page];


      buttons[index]
        .classList.add(
          "active"
        );


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }


    // ======================================================
    // ESCAPE HTML
    // ======================================================

    function escapeHtml(text) {

      const div =
        document.createElement(
          "div"
        );

      div.textContent =
        text;

      return div.innerHTML;

    }


    // ======================================================
    // SHOW ERROR
    // ======================================================

    function showError(message) {

      document
        .getElementById("loading")
        .style.display =
          "none";


      document
        .getElementById("errorScreen")
        .style.display =
          "flex";


      document
        .getElementById("errorMessage")
        .textContent =
          message;

    }


    // ======================================================
    // START
    // ======================================================

    authenticate();
