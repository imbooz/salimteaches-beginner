/*
 * SalimTeaches Beginner — UNIT CONTENT CONFIG
 * ============================================
 *
 * This is the ONLY file that should change when adding a new unit.
 * Everything else (unit-engine.js) reads this data and renders every
 * unit identically — same look, same card order, same lock behavior.
 *
 * To add Unit 4: copy the Unit 3 block below, change the numbers/links,
 * and add it to the UNIT_CONFIGS array. Nothing else needs to change.
 *
 * Activity "type" values the engine understands:
 *   lesson    — opens a YouTube video in the built-in player, always first
 *   workbook  — optional workbook-analysis video (skipped if you omit it)
 *   practice  — links to an interactive HTML exercise page
 *   listening — links to an interactive HTML exercise page
 *   reading   — links to an interactive HTML exercise page
 *   test      — links to an interactive HTML exercise page; locked until
 *               every activity listed in "requires" is completed
 *
 * "file" paths are relative to /activities/.
 * "requires" lists the activity `type`s (from this same unit) that must
 * be completed before this activity unlocks. Only used for the test.
 */

const UNIT_CONFIGS = [

  {
    id: 1,
    sortOrder: 1,
    title: "Greetings & Introductions",
    description: "Salomlashish va tanishish.",
    activities: [
      {
        type: "lesson",
        icon: "🎥",
        title: "1-Dars",
        subtitle: "Greetings & Introductions darsini ko‘ring.",
        videoId: "Kd7X6tKh6YA"
      },
      {
        type: "workbook",
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling.",
        videoId: "bj9rjwICNqU"
      },
      {
        type: "practice",
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 1 bo‘yicha interaktiv mashqlar.",
        file: "unit1-practice.html"
      },
      {
        type: "listening",
        icon: "🎧",
        title: "Listening",
        subtitle: "3 ta dialog va 14 ta savol.",
        file: "unit1-listening.html"
      },
      {
        type: "test",
        icon: "📝",
        title: "Unit 1 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        file: "unit1-test.html",
        requires: ["practice", "listening"]
      }
    ]
  },

  {
    id: 2,
    sortOrder: 2,
    title: "Hotels & Cafés",
    description: "Mehmonxona va kafeda muloqot qilish.",
    activities: [
      {
        type: "lesson",
        icon: "🎥",
        title: "2-Dars",
        subtitle: "Unit 2 darsini ko‘ring.",
        videoId: "WPGTM1Mb0JY"
      },
      {
        type: "workbook",
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling.",
        videoId: "JSmGBHUKyrs"
      },
      {
        type: "practice",
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 2 bo‘yicha interaktiv mashqlar.",
        file: "unit2-practice.html"
      },
      {
        type: "reading",
        icon: "📖",
        title: "Reading",
        subtitle: "3 ta matn va turli xil mashqlar.",
        file: "unit2-reading.html"
      },
      {
        type: "test",
        icon: "📝",
        title: "Unit 2 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        file: "unit2-test.html",
        requires: ["practice", "reading"]
      }
    ]
  },

  {
    id: 3,
    sortOrder: 3,
    title: "Jobs, Colours & To Be",
    description: "Jobs, colours, nationalities, days of the week va to be.",
    activities: [
      {
        type: "lesson",
        icon: "🎥",
        title: "3-Dars",
        subtitle: "Jobs, colours, nationalities va to be darsini ko‘ring.",
        videoId: "f4MXip7DSuU"
      },
      {
        type: "practice",
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 3 bo‘yicha 30 ta interaktiv savol.",
        file: "unit3-practice.html"
      },
      {
        type: "listening",
        icon: "🎧",
        title: "Listening",
        subtitle: "3 ta dialog va 15 ta savol.",
        file: "unit3-listening.html"
      },
      {
        type: "test",
        icon: "📝",
        title: "Unit 3 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        file: "unit3-test.html",
        requires: ["practice", "listening"]
      }
    ]
  }

  // Unit 4 goes here — copy a block above, fill in the content, done.

];
