const ALLOWED_ORIGIN = "https://imbooz.github.io";


// ============================================================
// RESPONSE HELPERS
// ============================================================

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Cache-Control": "no-store"
    }
  });
}


// ============================================================
// HMAC-SHA256
// ============================================================

async function hmacSha256(key, message) {

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message)
  );

  return new Uint8Array(signature);
}


function bytesToHex(bytes) {
  return [...bytes]
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}


function safeEqual(a, b) {

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return result === 0;
}


// ============================================================
// TELEGRAM AUTHENTICATION
// ============================================================

async function validateTelegramInitData(
  initData,
  botToken
) {

  if (!initData) {
    return {
      valid: false,
      error: "Missing initData"
    };
  }


  const params =
    new URLSearchParams(initData);


  const receivedHash =
    params.get("hash");


  if (!receivedHash) {
    return {
      valid: false,
      error: "Missing Telegram hash"
    };
  }


  // ----------------------------------------------------------
  // Check authentication age
  // ----------------------------------------------------------

  const authDate =
    Number(params.get("auth_date"));


  if (!authDate) {
    return {
      valid: false,
      error: "Missing auth_date"
    };
  }


  const now =
    Math.floor(Date.now() / 1000);


  const MAX_AGE =
    60 * 60;


  if (
    authDate > now + 300 ||
    now - authDate > MAX_AGE
  ) {

    return {
      valid: false,
      error: "Telegram authentication expired"
    };

  }


  // ----------------------------------------------------------
  // Build data-check-string
  // ----------------------------------------------------------

  params.delete("hash");


  const dataCheckString =
    [...params.entries()]
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .map(
        ([key, value]) =>
          `${key}=${value}`
      )
      .join("\n");


  // ----------------------------------------------------------
  // Telegram verification
  // ----------------------------------------------------------

  const secretKeyBytes =
    await hmacSha256(
      "WebAppData",
      botToken
    );


  const finalKey =
    await crypto.subtle.importKey(
      "raw",
      secretKeyBytes,
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );


  const calculatedHashBytes =
    await crypto.subtle.sign(
      "HMAC",
      finalKey,
      new TextEncoder().encode(
        dataCheckString
      )
    );


  const calculatedHash =
    bytesToHex(
      new Uint8Array(
        calculatedHashBytes
      )
    );


  if (
    !safeEqual(
      calculatedHash,
      receivedHash
    )
  ) {

    return {
      valid: false,
      error:
        "Invalid Telegram authentication"
    };

  }


  // ----------------------------------------------------------
  // Extract Telegram user
  // ----------------------------------------------------------

  const userData =
    params.get("user");


  if (!userData) {
    return {
      valid: false,
      error:
        "Telegram user information missing"
    };
  }


  let user;


  try {

    user =
      JSON.parse(userData);

  } catch {

    return {
      valid: false,
      error:
        "Invalid Telegram user data"
    };

  }


  return {
    valid: true,
    user
  };

}


// ============================================================
// PREMIUM GROUP CHECK
// ============================================================

async function checkGroupMembership(
  userId,
  botToken,
  groupId
) {

  const telegramUrl =
    `https://api.telegram.org/bot${botToken}` +
    `/getChatMember` +
    `?chat_id=${encodeURIComponent(groupId)}` +
    `&user_id=${encodeURIComponent(userId)}`;


  const response =
    await fetch(telegramUrl);


  const result =
    await response.json();


  if (!result.ok) {

    return {
      checked: false,
      member: false,
      error:
        result.description ||
        "Telegram membership check failed"
    };

  }


  const member =
    result.result;


  const status =
    member.status;


  const isMember =
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    (
      status === "restricted" &&
      member.is_member === true
    );


  return {
    checked: true,
    member: isMember,
    status
  };

}


// ============================================================
// AUTHENTICATE REQUEST
// ============================================================

async function authenticateRequest(
  request,
  env
) {

  let body;


  try {

    body =
      await request.json();

  } catch {

    return {
      ok: false,
      response:
        json({
          authorized: false,
          reason: "invalid_json"
        }, 400)
    };

  }


  const telegramAuth =
    await validateTelegramInitData(
      body.initData,
      env.TG_BOT_TOKEN
    );


  if (!telegramAuth.valid) {

    return {
      ok: false,
      response:
        json({
          authorized: false,
          reason:
            "telegram_auth_failed",
          error:
            telegramAuth.error
        }, 403)
    };

  }


  const user =
    telegramAuth.user;


  const membership =
    await checkGroupMembership(
      user.id,
      env.TG_BOT_TOKEN,
      env.GROUP_ID
    );


  if (!membership.checked) {

    return {
      ok: false,
      response:
        json({
          authorized: false,
          reason:
            "membership_check_failed",
          error:
            membership.error
        }, 403)
    };

  }


  if (!membership.member) {

    return {
      ok: false,
      response:
        json({
          authorized: false,
          reason: "not_member"
        })
    };

  }


  return {
    ok: true,
    user,
    membership,
    body
  };

}


// ============================================================
// SAVE STUDENT
// ============================================================

async function saveStudent(
  db,
  user
) {

  await db
    .prepare(`
      INSERT INTO students (
        telegram_id,
        username,
        first_name,
        joined_at,
        last_seen_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

      ON CONFLICT(telegram_id)
      DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        last_seen_at = CURRENT_TIMESTAMP
    `)
    .bind(
      user.id,
      user.username || null,
      user.first_name || ""
    )
    .run();

}


// ============================================================
// GET / SAVE STUDENT DISPLAY NAME
//
// display_name is a separate, student-chosen name (Telegram
// first_name/username are unreliable for a public leaderboard —
// many students don't use their real name there). Column added
// via: ALTER TABLE students ADD COLUMN display_name TEXT;
// ============================================================

async function getStudentDisplayName(
  db,
  telegramId
) {

  const result =
    await db
      .prepare(`
        SELECT display_name
        FROM students
        WHERE telegram_id = ?
      `)
      .bind(telegramId)
      .first();

  return result
    ? result.display_name
    : null;

}


async function saveStudentDisplayName(
  db,
  telegramId,
  displayName
) {

  await db
    .prepare(`
      UPDATE students
      SET display_name = ?
      WHERE telegram_id = ?
    `)
    .bind(
      displayName,
      telegramId
    )
    .run();

}


// ============================================================
// GET COURSE DATA
// ============================================================

async function getCourseData(
  db,
  telegramId
) {

  const unitsResult =
    await db
      .prepare(`
        SELECT
          unit_id,
          title,
          description,
          sort_order,
          is_available
        FROM units
        ORDER BY sort_order
      `)
      .all();


  const activityResult =
    await db
      .prepare(`
        SELECT
          activity_id,
          unit_id,
          activity_type,
          title,
          sort_order,
          is_required
        FROM activities
        ORDER BY unit_id, sort_order
      `)
      .all();


  const unitProgressResult =
    await db
      .prepare(`
        SELECT
          unit_id,
          completed,
          test_score,
          completed_at
        FROM unit_progress
        WHERE telegram_id = ?
      `)
      .bind(telegramId)
      .all();


  const activityProgressResult =
    await db
      .prepare(`
        SELECT
          activity_id,
          completed,
          score,
          completed_at
        FROM activity_progress
        WHERE telegram_id = ?
      `)
      .bind(telegramId)
      .all();


  const unitProgress = {};

  for (
    const row of unitProgressResult.results
  ) {

    unitProgress[row.unit_id] =
      row;

  }


  const activityProgress = {};

  for (
    const row of activityProgressResult.results
  ) {

    activityProgress[row.activity_id] =
      row;

  }


  return {
    units:
      unitsResult.results,

    activities:
      activityResult.results,

    unitProgress,

    activityProgress
  };

}


// ============================================================
// DETERMINE WHETHER A UNIT IS UNLOCKED
// ============================================================

function isUnitUnlocked(
  units,
  unitProgress,
  unitId
) {

  const unit =
    units.find(
      u => u.unit_id === unitId
    );


  if (!unit) {
    return false;
  }


  // Unit 1 is the starting point.
  if (unitId === 1) {
    return unit.is_available === 1;
  }


  // A unit must be published first.
  if (unit.is_available !== 1) {
    return false;
  }


  // Find previous unit.
  const previousUnit =
    units.find(
      u =>
        u.sort_order ===
        unit.sort_order - 1
    );


  if (!previousUnit) {
    return false;
  }


  const previousProgress =
    unitProgress[
      previousUnit.unit_id
    ];


  return Boolean(
    previousProgress &&
    previousProgress.completed === 1
  );

}


// ============================================================
// CHECK WHETHER A UNIT IS COMPLETE
// ============================================================

async function calculateUnitCompletion(
  db,
  telegramId,
  unitId
) {

  const activitiesResult =
    await db
      .prepare(`
        SELECT
          activity_id,
          activity_type,
          is_required
        FROM activities
        WHERE unit_id = ?
      `)
      .bind(unitId)
      .all();


  const requiredActivities =
    activitiesResult.results
      .filter(
        activity =>
          activity.is_required === 1
      );


  if (
    requiredActivities.length === 0
  ) {

    return {
      complete: false,
      testScore: null
    };

  }


  const progressResult =
    await db
      .prepare(`
        SELECT
          activity_id,
          completed,
          score
        FROM activity_progress
        WHERE telegram_id = ?
      `)
      .bind(telegramId)
      .all();


  const progressMap = {};

  for (
    const row of progressResult.results
  ) {

    progressMap[
      row.activity_id
    ] = row;

  }


  let allRequiredCompleted =
    true;


  let testScore = null;


  for (
    const activity
    of requiredActivities
  ) {

    const progress =
      progressMap[
        activity.activity_id
      ];


    if (
      !progress ||
      progress.completed !== 1
    ) {

      allRequiredCompleted =
        false;

    }


    if (
      activity.activity_type === "test"
    ) {

      testScore =
        progress
          ? progress.score
          : null;

    }

  }


  const testPassed =
    testScore !== null &&
    Number(testScore) >= 70;


  const complete =
    allRequiredCompleted &&
    testPassed;


  return {
    complete,
    testScore
  };

}


// ============================================================
// RECORD ACTIVITY PROGRESS
// ============================================================

async function recordProgress(
  db,
  telegramId,
  activityId,
  completed,
  score
) {

  // ----------------------------------------------------------
  // Find activity
  // ----------------------------------------------------------

  const activityResult =
    await db
      .prepare(`
        SELECT
          activity_id,
          unit_id,
          activity_type,
          is_required
        FROM activities
        WHERE activity_id = ?
      `)
      .bind(activityId)
      .first();


  if (!activityResult) {

    return {
      success: false,
      error:
        "Activity not found"
    };

  }


  // ----------------------------------------------------------
  // Find unit
  // ----------------------------------------------------------

  const unitResult =
    await db
      .prepare(`
        SELECT
          unit_id,
          title,
          sort_order,
          is_available
        FROM units
        WHERE unit_id = ?
      `)
      .bind(
        activityResult.unit_id
      )
      .first();


  if (!unitResult) {

    return {
      success: false,
      error:
        "Unit not found"
    };

  }


  // ----------------------------------------------------------
  // Validate test score
  // ----------------------------------------------------------

  if (
    activityResult.activity_type ===
    "test"
  ) {

    if (
      score === null ||
      score === undefined
    ) {

      return {
        success: false,
        error:
          "Test score is required"
      };

    }


    const numericScore =
      Number(score);


    if (
      Number.isNaN(
        numericScore
      ) ||
      numericScore < 0 ||
      numericScore > 100
    ) {

      return {
        success: false,
        error:
          "Invalid test score"
      };

    }

  }


  // ----------------------------------------------------------
  // Get existing activity progress
  // ----------------------------------------------------------

  const existingProgress =
    await db
      .prepare(`
        SELECT
          completed,
          score,
          completed_at
        FROM activity_progress
        WHERE telegram_id = ?
          AND activity_id = ?
      `)
      .bind(
        telegramId,
        activityId
      )
      .first();


  // ----------------------------------------------------------
  // Completion is permanent once earned.
  // ----------------------------------------------------------

  const newCompleted =
    completed ? 1 : 0;


  const storedCompleted =
    (
      existingProgress &&
      existingProgress.completed === 1
    ) || newCompleted === 1
      ? 1
      : 0;


  // ----------------------------------------------------------
  // Score handling
  //
  // Tests keep the highest score.
  // Other activities keep their normal latest score.
  // ----------------------------------------------------------

  let storedScore = null;


  if (
    activityResult.activity_type ===
    "test"
  ) {

    const newScore =
      score !== undefined &&
      score !== null
        ? Number(score)
        : null;


    const oldScore =
      existingProgress &&
      existingProgress.score !== null &&
      existingProgress.score !== undefined
        ? Number(existingProgress.score)
        : null;


    if (
      oldScore === null
    ) {

      storedScore =
        newScore;

    } else if (
      newScore === null
    ) {

      storedScore =
        oldScore;

    } else {

      storedScore =
        Math.max(
          oldScore,
          newScore
        );

    }

  } else {

    storedScore =
      score !== undefined &&
      score !== null
        ? Number(score)
        : null;

  }


  // ----------------------------------------------------------
  // Save activity progress
  // ----------------------------------------------------------

  await db
    .prepare(`
      INSERT INTO activity_progress (
        telegram_id,
        activity_id,
        completed,
        score,
        completed_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        CASE
          WHEN ? = 1
          THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        CURRENT_TIMESTAMP
      )

      ON CONFLICT(
        telegram_id,
        activity_id
      )
      DO UPDATE SET
        completed =
          excluded.completed,

        score =
          excluded.score,

        completed_at =
          CASE
            WHEN excluded.completed = 1
            THEN COALESCE(
              activity_progress.completed_at,
              CURRENT_TIMESTAMP
            )
            ELSE activity_progress.completed_at
          END,

        updated_at =
          CURRENT_TIMESTAMP
    `)
    .bind(
      telegramId,
      activityId,
      storedCompleted,
      storedScore,
      storedCompleted
    )
    .run();


  // ----------------------------------------------------------
  // Recalculate unit completion
  // ----------------------------------------------------------

  const completion =
    await calculateUnitCompletion(
      db,
      telegramId,
      unitResult.unit_id
    );


  // ----------------------------------------------------------
  // Get existing unit progress
  // ----------------------------------------------------------

  const existingUnitProgress =
    await db
      .prepare(`
        SELECT
          completed,
          test_score,
          completed_at
        FROM unit_progress
        WHERE telegram_id = ?
          AND unit_id = ?
      `)
      .bind(
        telegramId,
        unitResult.unit_id
      )
      .first();


  // ----------------------------------------------------------
  // Unit completion is also permanent once earned.
  // ----------------------------------------------------------

  const storedUnitCompleted =
    (
      existingUnitProgress &&
      existingUnitProgress.completed === 1
    ) || completion.complete
      ? 1
      : 0;


  // ----------------------------------------------------------
  // Preserve the highest test score at unit level too.
  // ----------------------------------------------------------

  const newUnitTestScore =
    completion.testScore !== null &&
    completion.testScore !== undefined
      ? Number(completion.testScore)
      : null;


  const oldUnitTestScore =
    existingUnitProgress &&
    existingUnitProgress.test_score !== null &&
    existingUnitProgress.test_score !== undefined
      ? Number(existingUnitProgress.test_score)
      : null;


  let storedUnitTestScore = null;


  if (
    oldUnitTestScore === null
  ) {

    storedUnitTestScore =
      newUnitTestScore;

  } else if (
    newUnitTestScore === null
  ) {

    storedUnitTestScore =
      oldUnitTestScore;

  } else {

    storedUnitTestScore =
      Math.max(
        oldUnitTestScore,
        newUnitTestScore
      );

  }


  // ----------------------------------------------------------
  // Save unit progress
  // ----------------------------------------------------------

  await db
    .prepare(`
      INSERT INTO unit_progress (
        telegram_id,
        unit_id,
        completed,
        test_score,
        completed_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        CASE
          WHEN ? = 1
          THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        CURRENT_TIMESTAMP
      )

      ON CONFLICT(
        telegram_id,
        unit_id
      )
      DO UPDATE SET
        completed =
          CASE
            WHEN unit_progress.completed = 1
            THEN 1
            WHEN excluded.completed = 1
            THEN 1
            ELSE 0
          END,

        test_score =
          CASE
            WHEN unit_progress.test_score IS NULL
            THEN excluded.test_score

            WHEN excluded.test_score IS NULL
            THEN unit_progress.test_score

            ELSE MAX(
              unit_progress.test_score,
              excluded.test_score
            )
          END,

        completed_at =
          CASE
            WHEN unit_progress.completed_at IS NOT NULL
            THEN unit_progress.completed_at

            WHEN excluded.completed = 1
            THEN CURRENT_TIMESTAMP

            ELSE NULL
          END,

        updated_at =
          CURRENT_TIMESTAMP
    `)
    .bind(
      telegramId,
      unitResult.unit_id,
      storedUnitCompleted,
      storedUnitTestScore,
      storedUnitCompleted
    )
    .run();


  // ----------------------------------------------------------
  // Read the final persisted unit state.
  // This is what the response should report.
  // ----------------------------------------------------------

  const finalUnitProgress =
    await db
      .prepare(`
        SELECT
          completed,
          test_score,
          completed_at
        FROM unit_progress
        WHERE telegram_id = ?
          AND unit_id = ?
      `)
      .bind(
        telegramId,
        unitResult.unit_id
      )
      .first();


  return {
    success: true,

    activity: {
      activityId:
        activityResult.activity_id,

      unitId:
        activityResult.unit_id,

      completed:
        Boolean(storedCompleted),

      score:
        storedScore
    },

    unit: {
      unitId:
        unitResult.unit_id,

      completed:
        Boolean(
          finalUnitProgress &&
          finalUnitProgress.completed === 1
        ),

      testScore:
        finalUnitProgress
          ? finalUnitProgress.test_score
          : null
    }

  };

}


// ============================================================
// LEADERBOARD
//
// Points formula (adjust the numbers below to change scoring):
//   - practice / listening / reading completed (>=70%): 10 points
//   - test completed (>=70%): 15 points + round(score / 5) bonus
//     (e.g. 100% test = 15 + 20 = 35 points, 70% test = 15 + 14 = 29)
//
// Every student appears (LEFT JOIN), even with zero activity yet,
// so "your rank" is always resolvable. Ties are broken by whoever
// joined earlier.
// ============================================================

async function getLeaderboard(
  db,
  telegramId
) {

  const result =
    await db
      .prepare(`
        SELECT
          s.telegram_id AS telegramId,
          s.first_name AS firstName,
          s.display_name AS displayName,
          COALESCE(SUM(
            CASE
              WHEN a.activity_type IN ('practice', 'listening', 'reading')
                AND ap.completed = 1
              THEN 10

              WHEN a.activity_type = 'test'
                AND ap.completed = 1
              THEN 15 + CAST(ROUND(ap.score / 5.0) AS INTEGER)

              ELSE 0
            END
          ), 0) AS points
        FROM students s
        LEFT JOIN activity_progress ap
          ON ap.telegram_id = s.telegram_id
        LEFT JOIN activities a
          ON a.activity_id = ap.activity_id
        GROUP BY s.telegram_id
        ORDER BY points DESC, s.joined_at ASC
      `)
      .all();


  const ranked =
    result.results.map(
      (row, index) => ({
        rank: index + 1,
        telegramId: row.telegramId,
        name:
          row.displayName ||
          row.firstName ||
          "Talaba",
        points: row.points
      })
    );


  const top5 =
    ranked.slice(0, 5);


  const you =
    ranked.find(
      row =>
        row.telegramId === telegramId
    ) || null;


  return {
    top5,
    you
  };

}


// ============================================================
// MAIN WORKER
// ============================================================

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);


    // ========================================================
    // CORS PREFLIGHT
    // ========================================================

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":
            ALLOWED_ORIGIN,

          "Access-Control-Allow-Headers":
            "Content-Type",

          "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS"
        }
      });

    }


    // ========================================================
    // HEALTH CHECK
    // ========================================================

    if (
      url.pathname === "/"
    ) {

      return new Response(
        "SalimTeaches authentication server is running.",
        {
          headers: {
            "Content-Type":
              "text/plain"
          }
        }
      );

    }


    // ========================================================
    // DATABASE TEST
    // ========================================================

    if (
      url.pathname === "/db-test"
    ) {

      try {

        const result =
          await env.DB
            .prepare(`
              SELECT
                unit_id,
                title,
                description,
                sort_order,
                is_available
              FROM units
              ORDER BY sort_order
            `)
            .all();


        return json({
          success: true,
          database: "connected",
          units:
            result.results
        });

      } catch (error) {

        return json({
          success: false,
          database: "error",
          error:
            error.message
        }, 500);

      }

    }


    // ========================================================
    // AUTHENTICATION
    // ========================================================

    if (
      url.pathname === "/auth"
    ) {

      if (
        request.method !== "POST"
      ) {

        return json({
          authorized: false,
          error:
            "Method Not Allowed"
        }, 405);

      }


      try {

        const auth =
          await authenticateRequest(
            request,
            env
          );


        if (!auth.ok) {
          return auth.response;
        }


        const user =
          auth.user;


        // ----------------------------------------------------
        // Save student
        // ----------------------------------------------------

        try {

          await saveStudent(
            env.DB,
            user
          );

        } catch (error) {

          console.error(
            "D1 student save failed:",
            error
          );

        }


        // ----------------------------------------------------
        // Get display name (leaderboard identity)
        // ----------------------------------------------------

        let displayName = null;

        try {

          displayName =
            await getStudentDisplayName(
              env.DB,
              user.id
            );

        } catch (error) {

          console.error(
            "D1 display name fetch failed:",
            error
          );

        }


        // ----------------------------------------------------
        // Get course
        // ----------------------------------------------------

        let course = {
          units: [],
          activities: [],
          unitProgress: {},
          activityProgress: {}
        };


        try {

          course =
            await getCourseData(
              env.DB,
              user.id
            );

        } catch (error) {

          console.error(
            "D1 course query failed:",
            error
          );

        }


        return json({

          authorized: true,

          user: {
            id:
              user.id,

            first_name:
              user.first_name,

            last_name:
              user.last_name ||
              null,

            username:
              user.username ||
              null,

            display_name:
              displayName
          },

          membership: {
            status:
              auth.membership.status
          },

          course

        });


      } catch (error) {

        console.error(
          "AUTH ERROR:",
          error
        );


        return json({
          authorized: false,
          reason:
            "server_error",
          error:
            error.message
        }, 500);

      }

    }


    // ========================================================
    // GET COURSE
    // ========================================================

    if (
      url.pathname === "/course"
    ) {

      if (
        request.method !== "POST"
      ) {

        return json({
          error:
            "Method Not Allowed"
        }, 405);

      }


      try {

        const auth =
          await authenticateRequest(
            request,
            env
          );


        if (!auth.ok) {
          return auth.response;
        }


        const course =
          await getCourseData(
            env.DB,
            auth.user.id
          );


        return json({

          authorized: true,

          user: {
            id:
              auth.user.id,

            first_name:
              auth.user.first_name
          },

          course

        });


      } catch (error) {

        console.error(
          "COURSE ERROR:",
          error
        );


        return json({
          error:
            "Could not load course"
        }, 500);

      }

    }


    // ========================================================
    // RECORD PROGRESS
    // ========================================================

    if (
      url.pathname === "/progress"
    ) {

      if (
        request.method !== "POST"
      ) {

        return json({
          success: false,
          error:
            "Method Not Allowed"
        }, 405);

      }


      try {

        const auth =
          await authenticateRequest(
            request,
            env
          );


        if (!auth.ok) {
          return auth.response;
        }


        const body = auth.body;


        const activityId =
          Number(
            body.activity_id
          );


        if (
          !activityId ||
          !Number.isInteger(
            activityId
          )
        ) {

          return json({
            success: false,
            error:
              "Invalid activity_id"
          }, 400);

        }


        const completed =
          body.completed === true;


        const score =
          body.score !== undefined &&
          body.score !== null
            ? Number(body.score)
            : null;


        const result =
          await recordProgress(
            env.DB,
            auth.user.id,
            activityId,
            completed,
            score
          );


        if (!result.success) {

          return json(
            result,
            400
          );

        }


        // ----------------------------------------------------
        // Return updated course data
        // ----------------------------------------------------

        const course =
          await getCourseData(
            env.DB,
            auth.user.id
          );


        return json({

          ...result,

          course

        });


      } catch (error) {

        console.error(
          "PROGRESS ERROR:",
          error
        );


        return json({
          success: false,
          error:
            "Could not save progress"
        }, 500);

      }

    }


    // ========================================================
    // SAVE PROFILE (display name)
    // ========================================================

    if (
      url.pathname === "/profile"
    ) {

      if (
        request.method !== "POST"
      ) {

        return json({
          success: false,
          error:
            "Method Not Allowed"
        }, 405);

      }


      try {

        const auth =
          await authenticateRequest(
            request,
            env
          );


        if (!auth.ok) {
          return auth.response;
        }


        const body = auth.body;


        const rawName =
          typeof body.display_name === "string"
            ? body.display_name
            : "";


        const displayName =
          rawName
            .trim()
            .slice(0, 40);


        if (!displayName) {

          return json({
            success: false,
            error:
              "Ism kiritilmadi"
          }, 400);

        }


        await saveStudentDisplayName(
          env.DB,
          auth.user.id,
          displayName
        );


        return json({
          success: true,
          display_name:
            displayName
        });


      } catch (error) {

        console.error(
          "PROFILE ERROR:",
          error
        );


        return json({
          success: false,
          error:
            "Could not save profile"
        }, 500);

      }

    }


    // ========================================================
    // LEADERBOARD
    // ========================================================

    if (
      url.pathname === "/leaderboard"
    ) {

      if (
        request.method !== "POST"
      ) {

        return json({
          success: false,
          error:
            "Method Not Allowed"
        }, 405);

      }


      try {

        const auth =
          await authenticateRequest(
            request,
            env
          );


        if (!auth.ok) {
          return auth.response;
        }


        const {
          top5,
          you
        } =
          await getLeaderboard(
            env.DB,
            auth.user.id
          );


        return json({
          success: true,
          leaderboard: top5,
          you
        });


      } catch (error) {

        console.error(
          "LEADERBOARD ERROR:",
          error
        );


        return json({
          success: false,
          error:
            "Could not load leaderboard"
        }, 500);

      }

    }


    // ========================================================
    // UNKNOWN ROUTE
    // ========================================================

    return json({
      error:
        "Not Found"
    }, 404);

  }

};
