const { createHmac, timingSafeEqual } = require("crypto");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "cvct";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "doi-secret-nay-tren-vercel";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SESSION_COOKIE_NAME = "sogielia_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function sendJson(res, payload, status = 200, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  Object.entries(extraHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (error) {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Body JSON khong hop le."));
      }
    });

    req.on("error", reject);
  });
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, field) || body[field] === "" || body[field] === null) {
      throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }
  }
}

function requireAdminRequest(req, res) {
  if (!isAuthenticated(req)) {
    sendJson(res, {
      ok: false,
      message: "Ban can dang nhap admin.",
    }, 401);
    return false;
  }

  return true;
}

function normalizeSubmission(row) {
  let expectation = [];

  try {
    expectation = JSON.parse(row.expectation_json || "[]");
  } catch (error) {
    expectation = [];
  }

  return {
    id: Number(row.id || 0),
    hidden: Boolean(row.hidden),
    fullName: row.full_name || "",
    birthYear: row.birth_year || "",
    phone: row.phone || "",
    email: row.email || "",
    city: row.city || "",
    occupation: row.occupation || "",
    identity: row.identity_text || "",
    motivation: row.motivation || "",
    story: row.story || "",
    strength: row.strength || "",
    expectation: Array.isArray(expectation) ? expectation : [],
    availability: row.availability || "",
    consent: Boolean(row.consent),
    photoDataUrl: row.photo_data_url || "",
    photoFileName: row.photo_file_name || "",
    submittedAt: row.submitted_at || "",
  };
}

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, cookiePart) => {
      const separatorIndex = cookiePart.indexOf("=");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = cookiePart.slice(0, separatorIndex).trim();
      const value = cookiePart.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function createSessionToken() {
  return createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(ADMIN_USERNAME)
    .digest("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left || "", "utf8");
  const rightBuffer = Buffer.from(right || "", "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sessionToken = cookies[SESSION_COOKIE_NAME] || "";
  return safeEqual(sessionToken, createSessionToken());
}

function createSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(createSessionToken())}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
  ];

  if (process.env.NODE_ENV !== "development") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function clearSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (process.env.NODE_ENV !== "development") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Chua cau hinh SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY tren Vercel.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`Supabase tra ve du lieu khong hop le: ${responseText}`);
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error_description || data.error)) ||
      responseText ||
      "Supabase request that bai.";
    throw new Error(message);
  }

  return data;
}

module.exports = async (req, res) => {
  const method = req.method || "GET";
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action || "";

  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (method === "GET" && action === "admin_status") {
      sendJson(res, {
        ok: true,
        authenticated: isAuthenticated(req),
      });
      return;
    }

    if (method === "POST" && action === "admin_login") {
      const body = await readRequestBody(req);
      const username = String(body.username || "");
      const password = String(body.password || "");

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        sendJson(res, {
          ok: false,
          message: "Sai tai khoan hoac mat khau.",
        }, 401);
        return;
      }

      sendJson(
        res,
        { ok: true },
        200,
        {
          "Set-Cookie": createSessionCookie(),
        }
      );
      return;
    }

    if (method === "POST" && action === "admin_logout") {
      sendJson(
        res,
        { ok: true },
        200,
        {
          "Set-Cookie": clearSessionCookie(),
        }
      );
      return;
    }

    if (method === "GET" && action === "list_submissions") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      const rows = await supabaseRequest("submissions?select=*&order=id.desc");
      sendJson(res, {
        ok: true,
        items: Array.isArray(rows) ? rows.map(normalizeSubmission) : [],
      });
      return;
    }

    if (method === "POST" && action === "create_submission") {
      const body = await readRequestBody(req);

      requireFields(body, [
        "fullName",
        "birthYear",
        "phone",
        "email",
        "city",
        "occupation",
        "motivation",
        "story",
        "strength",
        "availability",
        "submittedAt",
      ]);

      const createdRows = await supabaseRequest("submissions", {
        method: "POST",
        prefer: "return=representation",
        body: {
          full_name: String(body.fullName),
          birth_year: String(body.birthYear),
          phone: String(body.phone),
          email: String(body.email),
          city: String(body.city),
          occupation: String(body.occupation),
          identity_text: String(body.identity || ""),
          motivation: String(body.motivation),
          story: String(body.story),
          strength: String(body.strength),
          expectation_json: JSON.stringify(body.expectation || []),
          availability: String(body.availability),
          consent: Boolean(body.consent),
          photo_data_url: String(body.photoDataUrl || ""),
          photo_file_name: String(body.photoFileName || ""),
          hidden: Boolean(body.hidden),
          submitted_at: String(body.submittedAt),
        },
      });

      const createdItem = Array.isArray(createdRows) && createdRows.length ? createdRows[0] : null;
      sendJson(res, {
        ok: true,
        item: createdItem ? normalizeSubmission(createdItem) : null,
      }, 201);
      return;
    }

    if (method === "POST" && action === "hide_all_submissions") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      await supabaseRequest("submissions?hidden=eq.false", {
        method: "PATCH",
        body: {
          hidden: true,
        },
      });

      sendJson(res, { ok: true });
      return;
    }

    if (method === "POST" && action === "restore_all_submissions") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      await supabaseRequest("submissions?hidden=eq.true", {
        method: "PATCH",
        body: {
          hidden: false,
        },
      });

      sendJson(res, { ok: true });
      return;
    }

    if (method === "POST" && action === "update_submission_visibility") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      const body = await readRequestBody(req);
      const submissionId = Number(body.id);

      if (!Number.isInteger(submissionId) || submissionId <= 0) {
        sendJson(res, {
          ok: false,
          message: "ID ho so khong hop le.",
        }, 422);
        return;
      }

      const hidden = Boolean(body.hidden);
      const updatedRows = await supabaseRequest(`submissions?id=eq.${submissionId}`, {
        method: "PATCH",
        prefer: "return=representation",
        body: {
          hidden: hidden,
        },
      });

      const updatedItem = Array.isArray(updatedRows) && updatedRows.length ? updatedRows[0] : null;

      sendJson(res, {
        ok: true,
        item: updatedItem ? normalizeSubmission(updatedItem) : null,
      });
      return;
    }

    if (method === "POST" && action === "hide_selected_submissions") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      const body = await readRequestBody(req);
      const rawIds = Array.isArray(body.ids) ? body.ids : [];
      const submissionIds = rawIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (!submissionIds.length) {
        sendJson(res, {
          ok: false,
          message: "Chua chon ho so hop le de an.",
        }, 422);
        return;
      }

      await supabaseRequest(`submissions?id=in.(${submissionIds.join(",")})`, {
        method: "PATCH",
        body: {
          hidden: true,
        },
      });

      sendJson(res, {
        ok: true,
        hiddenIds: submissionIds,
      });
      return;
    }

    sendJson(res, {
      ok: false,
      message: "API khong hop le.",
    }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi server khong xac dinh.";
    sendJson(res, {
      ok: false,
      message: `Loi server: ${message}`,
    }, 500);
  }
};
