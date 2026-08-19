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
 *   lesson2   — OPTIONAL second lesson-video card (e.g. "Part 2" of a
 *               lesson that was recorded/uploaded in two parts). Behaves
 *               exactly like "lesson" (own video, own completion state)
 *               but needs its own DB activity_type ("lesson2") so it
 *               doesn't collide with the first lesson's backend row.
 *               Put it right after "lesson" in the activities array.
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
 *
 * MILESTONES (progress tests between units):
 * A block can be marked `milestone: true`. It still unlocks exactly like
 * any other unit (previous entry's test passed ≥70%, by sortOrder), but:
 *   - tapping its home card skips the detail page and opens its single
 *     "test" activity's file directly
 *   - "kicker" overrides the small "Unit N" label on its home card
 *     (its `id` is just an internal number, not a real unit — pick one
 *     outside the normal 1,2,3... unit-number range, e.g. 1001, so real
 *     unit numbers never have to be renumbered when a milestone is added)
 *   - it needs exactly one activity, type "test"
 * sortOrder still controls where it sits in the chain — bump every real
 * unit after it by 1 (see Unit 4 below).
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
        type: "workbook",
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling.",
        videoId: "wQBNfkJHvWQ"
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
  },

  {
    id: 1001,
    sortOrder: 4,
    milestone: true,
    kicker: "Nazorat testi",
    title: "1–3 Unit oraliq testi",
    description: "1, 2 va 3-Unit bo‘yicha bilimingizni tekshiruvchi yakuniy test.",
    icon: "🏁",
    activities: [
      {
        type: "test",
        icon: "📝",
        title: "Oraliq test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        file: "progress-test-1.html"
      }
    ]
  },

  {
    id: 4,
    sortOrder: 5,
    title: "Numbers, Age & Family",
    description: "Sonlar, yosh so‘rash va aytish, oila a’zolari, egalik ’s, olmoshlar, shaxsiy buyumlar va joy predloglari.",
    activities: [
      {
        type: "lesson",
        icon: "🎥",
        title: "4-Dars",
        subtitle: "Numbers, age, family va personal possessions darsini ko‘ring.",
        videoId: "BpvIu0x-kjI"
      },
      {
        type: "workbook",
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling.",
        videoId: "8AzqkJN6Tic"
      },
      {
        type: "practice",
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 4 bo‘yicha 30 ta interaktiv savol.",
        file: "unit4-practice.html"
      },
      {
        type: "reading",
        icon: "📖",
        title: "Reading",
        subtitle: "3 ta matn va turli xil mashqlar.",
        file: "unit4-reading.html"
      },
      {
        type: "test",
        icon: "📝",
        title: "Unit 4 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        file: "unit4-test.html",
        requires: ["practice", "reading"]
      }
    ]
  },

  {
    id: 5,
    sortOrder: 6,
    title: "Technology & Everyday Life",
    description: "Doimiy fe’llar, Present Simple, texnologiya va kompyuter lug‘ati, sifatlar va elektron pochta so‘rash.",
    activities: [
      {
        type: "lesson",
        icon: "🎥",
        title: "5-Dars (1-qism)",
        subtitle: "Unit 5 darsining 1-qismini ko‘ring.",
        videoId: "9Xo3JOtj-nM"
      },
      {
        type: "lesson2",
        icon: "🎥",
        title: "5-Dars (2-qism)",
        subtitle: "Unit 5 darsining 2-qismini ko‘ring.",
        videoId: "a6VYGqfbw6A"
      },
      {
        type: "workbook",
        icon: "🎬",
        title: "Workbook tahlili",
        subtitle: "Javoblarni men bilan birga tekshiring va xatolaringizni tahlil qiling."
        // videoId omitted — not recorded yet. Engine shows "Video tez orada
        // qo‘shiladi." until a videoId is added here.
      },
      {
        type: "practice",
        icon: "🧩",
        title: "Amaliy mashqlar",
        subtitle: "Unit 5 bo‘yicha 30 ta interaktiv savol.",
        file: "unit5-practice.html"
      },
      {
        type: "listening",
        icon: "🎧",
        title: "Listening",
        subtitle: "3 ta dialog va 15 ta savol.",
        file: "unit5-listening.html"
      },
      {
        type: "test",
        icon: "📝",
        title: "Unit 5 Test",
        subtitle: "Unitni tugatish uchun kamida 70% kerak.",
        file: "unit5-test.html",
        requires: ["practice", "listening"]
      }
    ]
  }

];
