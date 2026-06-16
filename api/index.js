const { createHmac, timingSafeEqual } = require("crypto");
let webpush = null;

try {
  webpush = require("web-push");
} catch (error) {
  webpush = null;
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "cvct";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "doi-secret-nay-tren-vercel";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@sogielia.local";
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

function parseStoredArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (Array.isArray(parsedValue)) {
      return parsedValue
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }
  } catch (error) {
    // Keep backward compatibility with older single-string values.
  }

  return [rawValue];
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
    truthConfirmation: Boolean(row.truth_confirmation),
    mediaConsent: Boolean(row.media_consent),
    consent: Boolean(row.consent),
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

function isWebPushReady() {
  return Boolean(webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

function ensureWebPushConfigured() {
  if (!isWebPushReady()) {
    return false;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

function normalizeSubscriptionPayload(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Subscription khong hop le.");
  }

  const endpoint = String(raw.endpoint || "").trim();
  const keys = raw.keys && typeof raw.keys === "object" ? raw.keys : {};
  const p256dh = String(keys.p256dh || "").trim();
  const auth = String(keys.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Subscription thieu endpoint hoac keys.");
  }

  return {
    endpoint,
    subscriptionJson: JSON.stringify({
      endpoint,
      keys: {
        p256dh,
        auth,
      },
    }),
  };
}

async function fetchActivePushSubscriptions() {
  const rows = await supabaseRequest("push_subscriptions?select=endpoint,subscription_json&active=eq.true");
  return Array.isArray(rows) ? rows : [];
}

async function markPushSubscriptionInactive(endpoint) {
  const safeEndpoint = encodeURIComponent(String(endpoint || ""));
  if (!safeEndpoint) {
    return;
  }

  await supabaseRequest(`push_subscriptions?endpoint=eq.${safeEndpoint}`, {
    method: "PATCH",
    body: {
      active: false,
    },
  });
}

async function sendAdminWebPush(payload) {
  if (!ensureWebPushConfigured()) {
    return;
  }

  const subscriptions = await fetchActivePushSubscriptions();
  if (!subscriptions.length) {
    return;
  }

  const message = JSON.stringify(payload || {});
  const tasks = subscriptions.map(async (row) => {
    let subscription = null;
    try {
      subscription = JSON.parse(row.subscription_json || "{}");
    } catch (error) {
      subscription = null;
    }

    if (!subscription || !subscription.endpoint) {
      await markPushSubscriptionInactive(row.endpoint);
      return;
    }

    try {
      await webpush.sendNotification(subscription, message);
    } catch (error) {
      const statusCode = error && typeof error === "object" ? Number(error.statusCode || error.status || 0) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await markPushSubscriptionInactive(subscription.endpoint);
      }
    }
  });

  await Promise.allSettled(tasks);
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

    if (method === "GET" && action === "vapid_public_key") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      if (!VAPID_PUBLIC_KEY) {
        sendJson(res, { ok: false, message: "Chua cau hinh VAPID_PUBLIC_KEY." }, 500);
        return;
      }

      sendJson(res, { ok: true, publicKey: VAPID_PUBLIC_KEY });
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

    if (method === "POST" && action === "save_push_subscription") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      const body = await readRequestBody(req);
      const subscription = body.subscription;
      const normalized = normalizeSubscriptionPayload(subscription);

      await supabaseRequest("push_subscriptions?on_conflict=endpoint", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: {
          endpoint: normalized.endpoint,
          subscription_json: normalized.subscriptionJson,
          active: true,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_agent: String(req.headers["user-agent"] || ""),
        },
      });

      sendJson(res, { ok: true });
      return;
    }

    if (method === "POST" && action === "delete_push_subscription") {
      if (!requireAdminRequest(req, res)) {
        return;
      }

      const body = await readRequestBody(req);
      const endpoint = String(body.endpoint || "").trim();
      if (!endpoint) {
        sendJson(res, { ok: false, message: "Thieu endpoint." }, 422);
        return;
      }

      await supabaseRequest(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
      });

      sendJson(res, { ok: true });
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

      const rows = await supabaseRequest(
        "submissions?select=id,hidden,full_name,birth_year,phone,email,city,occupation,identity_text,motivation,story,strength,expectation_json,availability,truth_confirmation,media_consent,consent,submitted_at&order=id.desc"
      );
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
          truth_confirmation: Boolean(body.truthConfirmation),
          media_consent: Boolean(body.mediaConsent),
          consent: Boolean(body.consent),
          hidden: Boolean(body.hidden),
          submitted_at: String(body.submittedAt),
        },
      });

      const createdItem = Array.isArray(createdRows) && createdRows.length ? createdRows[0] : null;
      try {
        await sendAdminWebPush({
          title: "Sogielia Mùa 7",
          body: `Có thí sinh mới đăng ký: ${String(createdItem && createdItem.full_name ? createdItem.full_name : body.fullName || "").trim() || "Không rõ tên"}`,
          url: "/admin.html",
        });
      } catch (error) {
      }
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

    if (method === "POST" && action === "delete_selected_submissions") {
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
          message: "Chua chon ho so hop le de xoa.",
        }, 422);
        return;
      }

      await supabaseRequest(`submissions?id=in.(${submissionIds.join(",")})`, {
        method: "DELETE",
      });

      sendJson(res, {
        ok: true,
        deletedIds: submissionIds,
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
