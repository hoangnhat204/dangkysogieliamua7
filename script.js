const API_BASE_URL = "/api";
const ZALO_GROUP_URL = "https://zalo.me/g/ukavrwis9myzilvd8yjq";
const BACKGROUND_MUSIC_PLAYLIST = [
  "assets/duonglendinh.mp3",
  "assets/kinhvanhoa.mp3",
];
const BACKGROUND_MUSIC_TIME_KEY = "sogieliaBackgroundMusicTime";
const BACKGROUND_MUSIC_UNLOCK_KEY = "sogieliaBackgroundMusicUnlocked";
const BACKGROUND_MUSIC_TRACK_INDEX_KEY = "sogieliaBackgroundMusicTrackIndex";
const selectedSubmissionIds = new Set();
let registrationForm;
let successMessage;
let loginForm;
let loginMessage;
let submissionList;
let emptyState;
let submissionCount;
let hideDataBtn;
let restoreDataBtn;
let exportExcelBtn;
let hideSelectedBtn;
let deleteSelectedBtn;
let submissionSearchInput;
let backgroundMusicAudio = null;
let cachedSubmissionItems = [];

function cacheDomElements() {
  registrationForm = document.getElementById("registrationForm");
  successMessage = document.getElementById("successMessage");
  loginForm = document.getElementById("loginForm");
  loginMessage = document.getElementById("loginMessage");
  submissionList = document.getElementById("submissionList");
  emptyState = document.getElementById("emptyState");
  submissionCount = document.getElementById("submissionCount");
  hideDataBtn = document.getElementById("hideDataBtn");
  restoreDataBtn = document.getElementById("restoreDataBtn");
  exportExcelBtn = document.getElementById("exportExcelBtn");
  hideSelectedBtn = document.getElementById("hideSelectedBtn");
  deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
  submissionSearchInput = document.getElementById("submissionSearch");
}

function isCurrentPage(pageName) {
  const path = window.location.pathname.toLowerCase();
  return (
    path.endsWith(`/${pageName}`) ||
    path.endsWith(`\\${pageName}`) ||
    path.endsWith(pageName)
  );
}

function redirectToLogin() {
  if (isCurrentPage("login.html")) {
    return;
  }

  navigateToInternalPage("login.html");
}

function clearExistingAuthControls(navLinks) {
  navLinks
    .querySelectorAll('a[href="login.html"], a[href="admin.html"], button[data-auth-action="logout"], #logoutButton')
    .forEach(function (element) {
      element.remove();
    });
}

function removeExistingAuthFab() {
  document.querySelectorAll(".auth-fab").forEach(function (element) {
    element.remove();
  });
}

function removeExistingZaloFab() {
  document.querySelectorAll(".zalo-fab").forEach(function (element) {
    element.remove();
  });
}

function createAuthFab(config) {
  const element = document.createElement(config.type === "button" ? "button" : "a");
  element.className = "floating-fab auth-fab";
  element.setAttribute("aria-label", config.label);
  element.title = config.label;
  element.innerHTML = `<span class="auth-fab-icon" aria-hidden="true">${config.icon}</span>`;

  if (config.type === "button") {
    element.type = "button";
    element.dataset.authAction = config.action || "";
  } else {
    element.href = config.href;
  }

  return element;
}

function renderZaloFab() {
  removeExistingZaloFab();

  const zaloFab = document.createElement("a");
  zaloFab.className = "floating-fab zalo-fab";
  zaloFab.href = ZALO_GROUP_URL;
  zaloFab.target = "_blank";
  zaloFab.rel = "noopener noreferrer";
  zaloFab.setAttribute("aria-label", "ZALO");
  zaloFab.title = "ZALO";
  zaloFab.innerHTML = '<span class="auth-fab-icon" aria-hidden="true">ZALO</span>';
  document.body.appendChild(zaloFab);
}

function isMobileViewport() {
  return window.innerWidth <= 720;
}

function updateNavigationMenuState(navLinks) {
  if (!navLinks) {
    return;
  }

  const navElement = navLinks.closest(".site-nav");
  const menuToggle = navElement ? navElement.querySelector(".nav-menu-toggle") : null;
  const hasMenuItems = Boolean(navLinks.querySelector("a, button"));

  if (menuToggle) {
    menuToggle.hidden = !hasMenuItems;
  }

  if (!hasMenuItems) {
    navLinks.classList.remove("is-open");
  }
}

function closeSiteNavMenus() {
  document.querySelectorAll(".site-nav .nav-links.is-open").forEach(function (element) {
    element.classList.remove("is-open");
  });

  document.querySelectorAll(".nav-menu-toggle[aria-expanded='true']").forEach(function (element) {
    element.setAttribute("aria-expanded", "false");
  });
}

function closeToolbarMenus() {
  document.querySelectorAll(".toolbar .toolbar-actions.is-open").forEach(function (element) {
    element.classList.remove("is-open");
  });

  document.querySelectorAll(".toolbar-menu-toggle[aria-expanded='true']").forEach(function (element) {
    element.setAttribute("aria-expanded", "false");
  });
}

function setupNavigationMenus() {
  document.querySelectorAll(".site-nav").forEach(function (navElement, index) {
    const navLinks = navElement.querySelector(".nav-links");

    if (!navLinks) {
      return;
    }

    navElement.classList.add("has-nav-menu");

    if (navElement.querySelector(".nav-menu-toggle")) {
      return;
    }

    const menuId = navLinks.id || `site-nav-links-${index + 1}`;
    navLinks.id = menuId;

    const menuToggle = document.createElement("button");
    menuToggle.type = "button";
    menuToggle.className = "nav-menu-toggle nav-button";
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-controls", menuId);
    menuToggle.innerHTML = '<span>Menu</span><span class="menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>';

    menuToggle.addEventListener("click", function () {
      const shouldOpen = !navLinks.classList.contains("is-open");

      closeSiteNavMenus();

      if (shouldOpen) {
        navLinks.classList.add("is-open");
        menuToggle.setAttribute("aria-expanded", "true");
      }
    });

    navLinks.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) {
        closeSiteNavMenus();
      }
    });

    navElement.insertBefore(menuToggle, navLinks);
    updateNavigationMenuState(navLinks);
  });
}

function isInternalNavigationLink(link) {
  if (!(link instanceof HTMLAnchorElement)) {
    return false;
  }

  const rawHref = link.getAttribute("href") || "";

  if (
    !rawHref ||
    rawHref.startsWith("#") ||
    link.hasAttribute("download") ||
    link.target === "_blank" ||
    link.dataset.noAjax === "true"
  ) {
    return false;
  }

  try {
    const targetUrl = new URL(link.href, window.location.href);
    const currentUrl = new URL(window.location.href);

    if (targetUrl.origin !== currentUrl.origin) {
      return false;
    }

    return /\.html$/i.test(targetUrl.pathname) || targetUrl.pathname === "/" || targetUrl.pathname.endsWith("/");
  } catch (error) {
    return false;
  }
}

async function navigateToInternalPage(url, options = {}) {
  const targetUrl = new URL(url, window.location.href);

  if (targetUrl.href === window.location.href && !options.forceLoad) {
    return;
  }

  closeSiteNavMenus();
  closeToolbarMenus();

  let responseText = "";

  try {
    const response = await fetch(targetUrl.href, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-Requested-With": "fetch",
      },
    });

    if (!response.ok) {
      throw new Error("Khong tai duoc trang.");
    }

    responseText = await response.text();
  } catch (error) {
    window.location.href = targetUrl.href;
    return;
  }

  const parser = new DOMParser();
  const nextDocument = parser.parseFromString(responseText, "text/html");
  const nextShell = nextDocument.querySelector(".site-shell");
  const nextFooter = nextDocument.querySelector(".footer");

  if (!nextShell) {
    window.location.href = targetUrl.href;
    return;
  }

  const currentShell = document.querySelector(".site-shell");
  const currentFooter = document.querySelector(".footer");

  if (!currentShell) {
    window.location.href = targetUrl.href;
    return;
  }

  currentShell.innerHTML = nextShell.innerHTML;

  if (currentFooter && nextFooter) {
    currentFooter.innerHTML = nextFooter.innerHTML;
  }

  document.title = nextDocument.title || document.title;

  if (options.replaceState) {
    window.history.replaceState({}, "", targetUrl.href);
  } else {
    window.history.pushState({}, "", targetUrl.href);
  }

  cacheDomElements();
  selectedSubmissionIds.clear();
  setupNavigationMenus();
  await renderNavigationAuth();

  if (isCurrentPage("admin.html")) {
    const authenticated = await requireAdminAuth();
    if (authenticated) {
      await renderSubmissionList();
    }
  } else if (isCurrentPage("login.html")) {
    await requireAdminAuth();
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

async function renderNavigationAuth() {
  const navLinks = document.querySelector(".nav-links");

  if (navLinks) {
    clearExistingAuthControls(navLinks);
    updateNavigationMenuState(navLinks);
  }

  removeExistingAuthFab();

  let authenticated = false;

  try {
    const status = await apiRequest("admin_status", {
      method: "GET",
    });
    authenticated = Boolean(status.authenticated);
  } catch (error) {
    authenticated = false;
  }

  if (authenticated) {
    const authFab = isCurrentPage("admin.html")
      ? createAuthFab({
          type: "button",
          action: "logout",
          label: "Đăng xuất",
          icon: "↩",
        })
      : createAuthFab({
          type: "link",
          href: "admin.html",
          label: "Admin",
          icon: "BTC",
        });

    document.body.appendChild(authFab);
    updateNavigationMenuState(navLinks);
    return true;
  }

  document.body.appendChild(
    createAuthFab({
      type: "link",
      href: "login.html",
      label: "Đăng nhập",
      icon: "BTC",
    })
  );

  updateNavigationMenuState(navLinks);
  return false;
}

async function requireAdminAuth() {
  const isAdminPage = isCurrentPage("admin.html");
  const isLoginPage = isCurrentPage("login.html");

  if (!isAdminPage && !isLoginPage) {
    return false;
  }

  try {
    const status = await apiRequest("admin_status", {
      method: "GET",
    });

    if (isAdminPage && !status.authenticated) {
      redirectToLogin();
      return false;
    }

    if (isLoginPage && status.authenticated) {
      window.location.href = "admin.html";
      return true;
    }

    return Boolean(status.authenticated);
  } catch (error) {
    if (isAdminPage) {
      redirectToLogin();
    }

    return false;
  }
}

function buildSubmissionPayload(formData, skillReview) {
  return {
    id: Date.now(),
    hidden: false,
    fullName: formData.get("fullName") || "",
    birthYear: formData.get("birthYear") || "",
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    city: formData.get("city") || "",
    occupation: formData.get("occupation") || "",
    identity: formData.get("identity") || "",
    motivation: formData.get("motivation") || "",
    story: formData.get("story") || "",
    strength: formData.get("strength") || "",
    expectation: [
      skillReview,
      formData.get("question13") || "",
      formData.get("question14") || "",
    ],
    availability: formData.get("availability") || "",
    truthConfirmation: Boolean(formData.get("truthConfirmation")),
    mediaConsent: Boolean(formData.get("mediaConsent")),
    consent: Boolean(formData.get("truthConfirmation") && formData.get("mediaConsent")),
    submittedAt: new Date().toISOString(),
  };
}

async function collectFormData(form) {
  const formData = new FormData(form);
  const skillReview = [
    `Giao tiếp: ${formData.get("communicationRating") || ""}. ${formData.get("communicationNote") || ""}`.trim(),
    `Làm việc nhóm: ${formData.get("teamworkRating") || ""}. ${formData.get("teamworkNote") || ""}`.trim(),
    `Thuyết trình: ${formData.get("presentationRating") || ""}. ${formData.get("presentationNote") || ""}`.trim(),
    `Quản lý thời gian: ${formData.get("timeManagementRating") || ""}. ${formData.get("timeManagementNote") || ""}`.trim(),
  ].join("\n");
  return buildSubmissionPayload(formData, skillReview);
}

async function apiRequest(action, options) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}?action=${encodeURIComponent(action)}`, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  } catch (fetchError) {
    const error = new Error("Khong ket noi duoc toi server. Vui long kiem tra Vercel, Supabase hoac cach mo website.");
    error.status = 0;
    throw error;
  }

  const responseText = await response.text();
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (parseError) {
    let message = "Khong doc duoc phan hoi tu server.";

    if (contentType.includes("text/html") || responseText.trim().startsWith("<")) {
      message = "Server dang tra ve HTML thay vi JSON. Voi Vercel, thuong la do API /api chua duoc deploy dung hoac route dang bi sai.";
    } else if (!responseText.trim()) {
      message = "Server tra ve rong. Vui long kiem tra API /api, bien moi truong Vercel va cau hinh Supabase.";
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (!response.ok || !data.ok) {
    const error = new Error(data.message || "Yeu cau that bai.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("vi-VN");
}

function getSubmissionExtendedAnswers(item) {
  const extraAnswers = Array.isArray(item.expectation) ? item.expectation : [];

  return {
    skillReview: extraAnswers[0] || "",
    hiddenAngles: extraAnswers[1] || "",
    differenceView: extraAnswers[2] || "",
  };
}

function setupBackgroundMusic() {
  if (!BACKGROUND_MUSIC_PLAYLIST.length || backgroundMusicAudio) {
    return;
  }

  const audio = document.createElement("audio");
  backgroundMusicAudio = audio;
  let playbackUnlocked = sessionStorage.getItem(BACKGROUND_MUSIC_UNLOCK_KEY) === "true";
  let trackIndex = Number(sessionStorage.getItem(BACKGROUND_MUSIC_TRACK_INDEX_KEY) || "0");

  if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= BACKGROUND_MUSIC_PLAYLIST.length) {
    trackIndex = 0;
  }

  audio.src = BACKGROUND_MUSIC_PLAYLIST[trackIndex];
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.style.display = "none";
  document.body.appendChild(audio);

  function syncStoredPlayback() {
    sessionStorage.setItem(BACKGROUND_MUSIC_TRACK_INDEX_KEY, String(trackIndex));
    sessionStorage.setItem(BACKGROUND_MUSIC_TIME_KEY, String(audio.currentTime || 0));
  }

  function loadTrack(nextTrackIndex, startTime) {
    trackIndex = nextTrackIndex;
    sessionStorage.setItem(BACKGROUND_MUSIC_TRACK_INDEX_KEY, String(trackIndex));
    sessionStorage.setItem(BACKGROUND_MUSIC_TIME_KEY, String(startTime || 0));
    audio.src = BACKGROUND_MUSIC_PLAYLIST[trackIndex];
    audio.load();
  }

  audio.addEventListener("loadedmetadata", function () {
    const savedTrackIndex = Number(sessionStorage.getItem(BACKGROUND_MUSIC_TRACK_INDEX_KEY) || String(trackIndex));
    const savedTime = Number(sessionStorage.getItem(BACKGROUND_MUSIC_TIME_KEY) || "0");

    if (
      savedTrackIndex === trackIndex &&
      Number.isFinite(savedTime) &&
      savedTime > 0 &&
      savedTime < audio.duration
    ) {
      audio.currentTime = savedTime;
    }
  });

  audio.addEventListener("timeupdate", function () {
    syncStoredPlayback();
  });

  audio.addEventListener("play", function () {
    playbackUnlocked = true;
    sessionStorage.setItem(BACKGROUND_MUSIC_UNLOCK_KEY, "true");
  });

  audio.addEventListener("ended", function () {
    const nextTrackIndex = (trackIndex + 1) % BACKGROUND_MUSIC_PLAYLIST.length;
    loadTrack(nextTrackIndex, 0);
    startPlayback();
  });

  audio.addEventListener("error", function () {
    sessionStorage.removeItem(BACKGROUND_MUSIC_UNLOCK_KEY);
  });

  function rememberTime() {
    syncStoredPlayback();
  }

  async function startPlayback() {
    try {
      await audio.play();
      playbackUnlocked = true;
      sessionStorage.setItem(BACKGROUND_MUSIC_UNLOCK_KEY, "true");
      window.removeEventListener("beforeunload", rememberTime);
      window.addEventListener("beforeunload", rememberTime);
    } catch (error) {
      playbackUnlocked = false;
    }
  }

  function unlockPlayback() {
    if (playbackUnlocked) {
      return;
    }

    startPlayback().finally(function () {
      if (playbackUnlocked) {
        document.removeEventListener("click", unlockPlayback);
        document.removeEventListener("keydown", unlockPlayback);
        document.removeEventListener("touchstart", unlockPlayback);
      }
    });
  }
  startPlayback();
  document.addEventListener("click", unlockPlayback);
  document.addEventListener("keydown", unlockPlayback);
  document.addEventListener("touchstart", unlockPlayback, { passive: true });
}

function getVisibleSubmissions(items) {
  return items.filter(function (item) {
    return !item.hidden;
  });
}

function getHiddenSubmissions(items) {
  return items.filter(function (item) {
    return item.hidden;
  });
}

function filterSubmissionsByName(items, keyword) {
  const normalizedKeyword = String(keyword || "").trim().toLowerCase();

  if (!normalizedKeyword) {
    return items.slice();
  }

  return items.filter(function (item) {
    return String(item.fullName || "").toLowerCase().includes(normalizedKeyword);
  });
}

function syncSelectedSubmissionIds(items) {
  const validIds = new Set(
    items.map(function (item) {
      return Number(item.id);
    })
  );

  Array.from(selectedSubmissionIds).forEach(function (id) {
    if (!validIds.has(id)) {
      selectedSubmissionIds.delete(id);
    }
  });
}

function updateSelectedActionButtons() {
  if (!hideSelectedBtn && !deleteSelectedBtn) {
    return;
  }

  const selectedCount = selectedSubmissionIds.size;

  if (hideSelectedBtn) {
    hideSelectedBtn.disabled = selectedCount === 0;
    hideSelectedBtn.textContent = selectedCount ? `Ẩn ${selectedCount} thí sinh đã chọn` : "Ẩn thí sinh đã chọn";
  }

  if (deleteSelectedBtn) {
    deleteSelectedBtn.disabled = selectedCount === 0;
    deleteSelectedBtn.textContent = selectedCount ? `Xóa ${selectedCount} thí sinh đã chọn` : "Xóa thí sinh đã chọn";
  }
}

function createExcelContent(submissions) {
  const rows = submissions
    .map(function (item) {
      const extendedAnswers = getSubmissionExtendedAnswers(item);

      return `
        <tr>
          <td>${escapeHtml(formatDateTime(item.submittedAt))}</td>
          <td>${escapeHtml(item.fullName)}</td>
          <td>${escapeHtml(item.birthYear)}</td>
          <td>${escapeHtml(item.city)}</td>
          <td>${escapeHtml(item.occupation)}</td>
          <td>${escapeHtml(item.identity || "")}</td>
          <td>${escapeHtml(item.phone)}</td>
          <td>${escapeHtml(item.email)}</td>
          <td>${escapeHtml(item.motivation)}</td>
          <td>${escapeHtml(item.story)}</td>
          <td>${escapeHtml(item.strength)}</td>
          <td>${escapeHtml(extendedAnswers.skillReview || "")}</td>
          <td>${escapeHtml(item.availability || "")}</td>
          <td>${escapeHtml(extendedAnswers.hiddenAngles || "")}</td>
          <td>${escapeHtml(extendedAnswers.differenceView || "")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Thời gian gửi</th>
              <th>Họ và tên</th>
              <th>Ngày sinh</th>
              <th>Quê quán</th>
              <th>Nơi ở/học tập/làm việc tại Cần Thơ</th>
              <th>Thuộc cộng đồng LGBTIQ+</th>
              <th>Số điện thoại</th>
              <th>Zalo</th>
              <th>Tổ chức cộng đồng/Doanh nghiệp xã hội</th>
              <th>Lý do đăng ký</th>
              <th>Mục tiêu tại cuộc thi</th>
              <th>Đánh giá 4 kỹ năng</th>
              <th>Mảnh ghép kính vạn hoa</th>
              <th>Góc khuất cần được nhìn thấy</th>
              <th>Quan điểm về sự khác biệt</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
}

async function fetchSubmissions() {
  const data = await apiRequest("list_submissions", {
    method: "GET",
  });
  return Array.isArray(data.items) ? data.items : [];
}

async function updateSubmissionVisibility(id, hidden) {
  const data = await apiRequest("update_submission_visibility", {
    method: "POST",
    body: JSON.stringify({
      id: id,
      hidden: hidden,
    }),
  });

  return data.item || null;
}

async function hideSelectedSubmissions(ids) {
  const data = await apiRequest("hide_selected_submissions", {
    method: "POST",
    body: JSON.stringify({
      ids: ids,
    }),
  });

  return Array.isArray(data.hiddenIds) ? data.hiddenIds : [];
}

async function deleteSelectedSubmissions(ids) {
  const data = await apiRequest("delete_selected_submissions", {
    method: "POST",
    body: JSON.stringify({
      ids: ids,
    }),
  });

  return Array.isArray(data.deletedIds) ? data.deletedIds : [];
}

async function renderSubmissionList(options) {
  if (!submissionList || !emptyState || !submissionCount) {
    return;
  }

  const nextOptions = options || {};
  const shouldRefresh = nextOptions.forceRefresh === true || !cachedSubmissionItems.length;
  let submissions = cachedSubmissionItems.slice();

  if (shouldRefresh) {
    try {
      submissions = await fetchSubmissions();
      cachedSubmissionItems = submissions.slice();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      emptyState.hidden = false;
      emptyState.textContent = "Khong tai duoc du lieu tu server. Vui long kiem tra Vercel, route /api va cau hinh Supabase.";
      submissionList.innerHTML = "";
      submissionCount.textContent = "Khong tai duoc du lieu";
      if (restoreDataBtn) {
        restoreDataBtn.hidden = true;
      }
      return;
    }
  }

  syncSelectedSubmissionIds(submissions);

  const visibleSubmissions = getVisibleSubmissions(submissions);
  const hiddenSubmissions = getHiddenSubmissions(submissions);
  const keyword = submissionSearchInput ? submissionSearchInput.value : "";
  const matchedSubmissions = filterSubmissionsByName(visibleSubmissions, keyword).sort(function (left, right) {
    return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
  });
  submissionCount.textContent = `${visibleSubmissions.length} hồ sơ đang hiển thị${hiddenSubmissions.length ? ` | ${hiddenSubmissions.length} hồ sơ đã ẩn` : ""}${keyword.trim() ? ` | ${matchedSubmissions.length} kết quả phù hợp` : ""}${selectedSubmissionIds.size ? ` | ${selectedSubmissionIds.size} hồ sơ đã chọn` : ""}`;
  submissionList.innerHTML = "";
  updateSelectedActionButtons();

  if (restoreDataBtn) {
    restoreDataBtn.hidden = hiddenSubmissions.length === 0;
  }

  if (!submissions.length) {
    emptyState.hidden = false;
    emptyState.innerHTML = `Chưa có hồ sơ nào trong cơ sở dữ liệu admin. Khi thí sinh bấm gửi từ
            <a class="inline-link" href="dang-ky.html">trang đăng ký</a>,
            dữ liệu sẽ xuất hiện tại đây.`;
    return;
  }

  if (!visibleSubmissions.length) {
    emptyState.hidden = false;
    emptyState.textContent = "Toàn bộ hồ sơ hiện đang được ẩn. Bấm 'Hiện lại dữ liệu ẩn' để xem lại.";
    return;
  }

  if (!matchedSubmissions.length) {
    emptyState.hidden = false;
    emptyState.textContent = "Không tìm thấy hồ sơ nào khớp với tên bạn đang tìm.";
    return;
  }

  emptyState.hidden = true;

  matchedSubmissions.forEach(function (item) {
    const extendedAnswers = getSubmissionExtendedAnswers(item);

    const card = document.createElement("details");
    card.className = `data-card${item.hidden ? " is-hidden-card" : ""}`;
    card.innerHTML = `
      <summary>
        <div class="data-card-head">
          <label class="submission-select-control" aria-label="Chọn hồ sơ ${escapeHtml(item.fullName)} để ẩn">
            <input type="checkbox" class="submission-select-checkbox" data-submission-select-id="${item.id}" ${selectedSubmissionIds.has(Number(item.id)) ? "checked" : ""} />
            <span>Chọn</span>
          </label>
          <div>
            <h3>${escapeHtml(item.fullName)}</h3>
            <p>Zalo: ${escapeHtml(item.email)} | SĐT: ${escapeHtml(item.phone)}</p>
          </div>
          <div class="data-card-meta">
            <span class="status-pill${item.hidden ? " is-hidden" : ""}">${item.hidden ? "Đã ẩn" : "Đang hiện"}</span>
            <span class="date">${escapeHtml(formatDateTime(item.submittedAt))}</span>
          </div>
        </div>
      </summary>
      <div class="data-card-body">
        <div class="data-grid">
          <div><strong>Ngày tháng năm sinh</strong><span>${escapeHtml(item.birthYear)}</span></div>
          <div><strong>Quê quán</strong><span>${escapeHtml(item.city)}</span></div>
          <div><strong>Ở/học tập/làm việc tại Cần Thơ</strong><span>${escapeHtml(item.occupation)}</span></div>
          <div><strong>Thuộc cộng đồng LGBTIQ+</strong><span>${escapeHtml(item.identity || "Không cung cấp")}</span></div>
        </div>
        <div class="data-block">
          <strong>Thuộc tổ chức cộng đồng/Doanh nghiệp xã hội</strong>
          <p>${escapeHtml(item.motivation || "Không cung cấp")}</p>
        </div>
        <div class="data-block">
          <strong>Lý do đăng ký tham gia cuộc thi năm nay</strong>
          <p>${escapeHtml(item.story)}</p>
        </div>
        <div class="data-block">
          <strong>Mục tiêu khi đến với cuộc thi</strong>
          <p>${escapeHtml(item.strength)}</p>
        </div>
        <div class="data-block">
          <strong>Đánh giá 4 kỹ năng</strong>
          <p>${escapeHtml(extendedAnswers.skillReview || "Không cung cấp")}</p>
        </div>
        <div class="data-block">
          <strong>Mảnh ghép kính vạn hoa bạn mang đến</strong>
          <p>${escapeHtml(item.availability || "Không cung cấp")}</p>
        </div>
        <div class="data-block">
          <strong>Những "góc khuất" cần được nhìn thấy rõ hơn</strong>
          <p>${escapeHtml(extendedAnswers.hiddenAngles || "Không cung cấp")}</p>
        </div>
        <div class="data-block">
          <strong>Quan điểm về sự khác biệt</strong>
          <p>${escapeHtml(extendedAnswers.differenceView || "Không cung cấp")}</p>
        </div>
        <div class="data-card-actions print-hidden">
          <button class="button button-secondary" type="button" data-submission-visibility-id="${item.id}" data-submission-hidden-target="${item.hidden ? "false" : "true"}">
            ${item.hidden ? "Hiện hồ sơ này" : "Ẩn hồ sơ này"}
          </button>
        </div>
      </div>
    `;
    submissionList.appendChild(card);
  });
}

document.addEventListener("submit", async function (event) {
  const submittedLoginForm = event.target.closest("#loginForm");
  const submittedRegistrationForm = event.target.closest("#registrationForm");

  if (submittedLoginForm && loginMessage) {
    event.preventDefault();
    loginMessage.classList.remove("show", "error");

    if (!submittedLoginForm.checkValidity()) {
      submittedLoginForm.reportValidity();
      return;
    }

    const username = submittedLoginForm.username.value.trim();
    const password = submittedLoginForm.password.value;

    try {
      await apiRequest("admin_login", {
        method: "POST",
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      await navigateToInternalPage("admin.html");
      return;
    } catch (error) {
      loginMessage.textContent = error.message || "Đăng nhập không thành công. Vui lòng thử lại.";
      loginMessage.classList.add("error", "show");
    }

    return;
  }

  if (submittedRegistrationForm && successMessage) {
    event.preventDefault();

    if (!submittedRegistrationForm.checkValidity()) {
      submittedRegistrationForm.reportValidity();
      return;
    }

    successMessage.classList.remove("show", "error");

    try {
      const payload = await collectFormData(submittedRegistrationForm);

      await apiRequest("create_submission", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      successMessage.textContent = "Đăng ký thành công";
      successMessage.classList.add("show");
      submittedRegistrationForm.classList.add("submitted");
      submittedRegistrationForm.reset();
      submittedRegistrationForm.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      submittedRegistrationForm.classList.remove("submitted");
      successMessage.textContent =
        error.message || "Khong gui duoc du lieu len server. Vui long kiem tra Vercel, Supabase va route /api.";
      successMessage.classList.add("error", "show");
    }
  }
});

document.addEventListener("click", async function (event) {
  const navigationLink = event.target.closest("a[href]");
  const logoutControl = event.target.closest('button[data-auth-action="logout"], #logoutButton');
  const visibilityControl = event.target.closest("button[data-submission-visibility-id]");
  const submissionSelectControl = event.target.closest(".submission-select-control");
  const hideDataControl = event.target.closest("#hideDataBtn");
  const restoreDataControl = event.target.closest("#restoreDataBtn");
  const exportExcelControl = event.target.closest("#exportExcelBtn");
  const hideSelectedControl = event.target.closest("#hideSelectedBtn");
  const deleteSelectedControl = event.target.closest("#deleteSelectedBtn");

  if (
    navigationLink &&
    isInternalNavigationLink(navigationLink) &&
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    event.preventDefault();
    await navigateToInternalPage(navigationLink.href);
    return;
  }

  if (submissionSelectControl) {
    const submissionSelectCheckbox = submissionSelectControl.querySelector("input[data-submission-select-id]");

    event.preventDefault();
    event.stopPropagation();

    if (submissionSelectCheckbox) {
      submissionSelectCheckbox.checked = !submissionSelectCheckbox.checked;
      submissionSelectCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return;
  }

  if (visibilityControl) {
    const submissionId = Number(visibilityControl.dataset.submissionVisibilityId || "0");
    const hiddenTarget = visibilityControl.dataset.submissionHiddenTarget === "true";

    visibilityControl.disabled = true;

    try {
      await updateSubmissionVisibility(submissionId, hiddenTarget);
      await renderSubmissionList({ forceRefresh: true });
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }

      window.alert("Khong cap nhat duoc trang thai hien/ an cho ho so nay.");
    } finally {
      visibilityControl.disabled = false;
    }

    return;
  }

  if (hideDataControl) {
    let submissions = [];

    try {
      submissions = cachedSubmissionItems.length ? cachedSubmissionItems.slice() : await fetchSubmissions();
    } catch (error) {
      return;
    }

    const visibleSubmissions = getVisibleSubmissions(submissions);

    if (!visibleSubmissions.length) {
      return;
    }

    if (!window.confirm("Bạn có chắc muốn ẩn toàn bộ dữ liệu đang hiển thị trên trang admin không?")) {
      return;
    }

    try {
      await apiRequest("hide_all_submissions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await renderSubmissionList({ forceRefresh: true });
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      window.alert("Khong an duoc du lieu tren server.");
    }

    return;
  }

  if (restoreDataControl) {
    try {
      await apiRequest("restore_all_submissions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await renderSubmissionList({ forceRefresh: true });
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      window.alert("Khong hien lai du lieu tren server.");
    }

    return;
  }

  if (exportExcelControl) {
    let visibleSubmissions = [];

    try {
      visibleSubmissions = getVisibleSubmissions(
        cachedSubmissionItems.length ? cachedSubmissionItems.slice() : await fetchSubmissions()
      );
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      window.alert("Khong lay duoc du lieu de xuat Excel.");
      return;
    }

    if (!visibleSubmissions.length) {
      return;
    }

    const excelContent = createExcelContent(visibleSubmissions);
    const blob = new Blob([excelContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "du-lieu-thi-sinh-sogielia-mua-7.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  if (hideSelectedControl) {
    const ids = Array.from(selectedSubmissionIds);

    if (!ids.length) {
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn ẩn ${ids.length} thí sinh đã chọn không?`)) {
      return;
    }

    hideSelectedControl.disabled = true;

    try {
      await hideSelectedSubmissions(ids);
      selectedSubmissionIds.clear();
      await renderSubmissionList({ forceRefresh: true });
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }

      window.alert("Khong an duoc cac ho so da chon.");
      updateSelectedActionButtons();
    }

    return;
  }

  if (deleteSelectedControl) {
    const ids = Array.from(selectedSubmissionIds);

    if (!ids.length) {
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${ids.length} thí sinh đã chọn khỏi hệ thống không?`)) {
      return;
    }

    deleteSelectedControl.disabled = true;

    try {
      await deleteSelectedSubmissions(ids);
      selectedSubmissionIds.clear();
      await renderSubmissionList({ forceRefresh: true });
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }

      window.alert("Khong xoa duoc cac ho so da chon.");
      updateSelectedActionButtons();
    }

    return;
  }

  if (!logoutControl) {
    return;
  }

  if (logoutControl.dataset.logoutPending === "true") {
    return;
  }

  logoutControl.dataset.logoutPending = "true";

  try {
    await apiRequest("admin_logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch (error) {
    // Redirect anyway so the user is not stuck if the session is already gone.
  }

  await navigateToInternalPage("login.html");
});

document.addEventListener("change", function (event) {
  const submissionSelectCheckbox = event.target.closest("input[data-submission-select-id]");

  if (!submissionSelectCheckbox) {
    return;
  }

  const submissionId = Number(submissionSelectCheckbox.dataset.submissionSelectId || "0");

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    submissionSelectCheckbox.checked = false;
    return;
  }

  if (submissionSelectCheckbox.checked) {
    selectedSubmissionIds.add(submissionId);
  } else {
    selectedSubmissionIds.delete(submissionId);
  }

  updateSelectedActionButtons();

  if (submissionCount && submissionList) {
    renderSubmissionList();
  }
});

document.addEventListener("input", function (event) {
  if (event.target.closest("#submissionSearch")) {
    renderSubmissionList();
  }
});

document.addEventListener("click", function (event) {
  if (!event.target.closest(".site-nav")) {
    closeSiteNavMenus();
  }

  if (!event.target.closest(".toolbar")) {
  }
});

window.addEventListener("resize", function () {
  if (!isMobileViewport()) {
    closeSiteNavMenus();
    closeToolbarMenus();
  }
});

window.addEventListener("popstate", async function () {
  await navigateToInternalPage(window.location.href, {
    replaceState: true,
    forceLoad: true,
  });
});

async function initializePage() {
  cacheDomElements();
  setupBackgroundMusic();
  setupNavigationMenus();
  renderZaloFab();
  await renderNavigationAuth();

  if (isCurrentPage("admin.html")) {
    const authenticated = await requireAdminAuth();
    if (authenticated) {
      await renderSubmissionList();
    }
    return;
  }

  if (isCurrentPage("login.html")) {
    await requireAdminAuth();
  }
}

initializePage();
