const registrationForm = document.getElementById("registrationForm");
const successMessage = document.getElementById("successMessage");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const submissionList = document.getElementById("submissionList");
const emptyState = document.getElementById("emptyState");
const submissionCount = document.getElementById("submissionCount");
const hideDataBtn = document.getElementById("hideDataBtn");
const restoreDataBtn = document.getElementById("restoreDataBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const API_BASE_URL = "/api";
const BACKGROUND_MUSIC_URL = "assets/background-music.mp3";
const BACKGROUND_MUSIC_TIME_KEY = "sogieliaBackgroundMusicTime";
const BACKGROUND_MUSIC_UNLOCK_KEY = "sogieliaBackgroundMusicUnlocked";

function isCurrentPage(pageName) {
  const path = window.location.pathname.toLowerCase();
  return (
    path.endsWith(`/${pageName}`) ||
    path.endsWith(`\\${pageName}`) ||
    path.endsWith(pageName)
  );
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function createNavLink(href, label, isActive) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;

  if (isActive) {
    link.classList.add("active");
  }

  return link;
}

function createLogoutButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-button";
  button.dataset.authAction = "logout";
  button.textContent = "Đăng xuất";
  return button;
}

function clearExistingAuthControls(navLinks) {
  navLinks
    .querySelectorAll('a[href="login.html"], a[href="admin.html"], button[data-auth-action="logout"], #logoutButton')
    .forEach(function (element) {
      element.remove();
    });
}

async function renderNavigationAuth() {
  const navLinks = document.querySelector(".nav-links");

  if (!navLinks) {
    return false;
  }

  clearExistingAuthControls(navLinks);

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
    navLinks.appendChild(createNavLink("admin.html", "Admin", isCurrentPage("admin.html")));
    navLinks.appendChild(createLogoutButton());
    return true;
  }

  navLinks.appendChild(createNavLink("login.html", "Đăng nhập", isCurrentPage("login.html")));
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

function collectFormData(form) {
  const formData = new FormData(form);

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
    expectation: formData.getAll("expectation"),
    availability: formData.get("availability") || "",
    consent: Boolean(formData.get("consent")),
    submittedAt: new Date().toISOString(),
  };
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

function setupBackgroundMusic() {
  const audio = document.createElement("audio");
  let playbackUnlocked = sessionStorage.getItem(BACKGROUND_MUSIC_UNLOCK_KEY) === "true";

  audio.src = BACKGROUND_MUSIC_URL;
  audio.loop = true;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.style.display = "none";
  document.body.appendChild(audio);

  audio.addEventListener("loadedmetadata", function () {
    const savedTime = Number(sessionStorage.getItem(BACKGROUND_MUSIC_TIME_KEY) || "0");

    if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < audio.duration) {
      audio.currentTime = savedTime;
    }
  });

  audio.addEventListener("timeupdate", function () {
    sessionStorage.setItem(BACKGROUND_MUSIC_TIME_KEY, String(audio.currentTime || 0));
  });

  audio.addEventListener("play", function () {
    playbackUnlocked = true;
    sessionStorage.setItem(BACKGROUND_MUSIC_UNLOCK_KEY, "true");
  });

  audio.addEventListener("error", function () {
    sessionStorage.removeItem(BACKGROUND_MUSIC_UNLOCK_KEY);
  });

  function rememberTime() {
    sessionStorage.setItem(BACKGROUND_MUSIC_TIME_KEY, String(audio.currentTime || 0));
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

function createExcelContent(submissions) {
  const rows = submissions
    .map(function (item) {
      return `
        <tr>
          <td>${escapeHtml(formatDateTime(item.submittedAt))}</td>
          <td>${escapeHtml(item.fullName)}</td>
          <td>${escapeHtml(item.birthYear)}</td>
          <td>${escapeHtml(item.phone)}</td>
          <td>${escapeHtml(item.email)}</td>
          <td>${escapeHtml(item.city)}</td>
          <td>${escapeHtml(item.occupation)}</td>
          <td>${escapeHtml(item.identity || "")}</td>
          <td>${escapeHtml(item.motivation)}</td>
          <td>${escapeHtml(item.story)}</td>
          <td>${escapeHtml(item.strength)}</td>
          <td>${escapeHtml(item.expectation.length ? item.expectation.join(", ") : "")}</td>
          <td>${escapeHtml(item.availability || "")}</td>
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
              <th>Năm sinh</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Tỉnh / Thành phố</th>
              <th>Trường học / Công việc</th>
              <th>Giới thiệu bản thân</th>
              <th>Động lực tham gia</th>
              <th>Góc nhìn về chủ đề</th>
              <th>Điểm mạnh</th>
              <th>Mong muốn nhận được</th>
              <th>Khả năng tham gia</th>
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

async function renderSubmissionList() {
  if (!submissionList || !emptyState || !submissionCount) {
    return;
  }

  let submissions = [];

  try {
    submissions = await fetchSubmissions();
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

  const visibleSubmissions = getVisibleSubmissions(submissions);
  const hiddenSubmissions = getHiddenSubmissions(submissions);
  submissionCount.textContent = `${visibleSubmissions.length} hồ sơ đang hiển thị${hiddenSubmissions.length ? ` | ${hiddenSubmissions.length} hồ sơ đã ẩn` : ""}`;
  submissionList.innerHTML = "";

  if (restoreDataBtn) {
    restoreDataBtn.hidden = hiddenSubmissions.length === 0;
  }

  if (!visibleSubmissions.length) {
    emptyState.hidden = false;
    emptyState.innerHTML = hiddenSubmissions.length
      ? `Hiện không có hồ sơ nào đang hiển thị. Có ${hiddenSubmissions.length} hồ sơ đã được ẩn.`
      : `Chưa có hồ sơ nào trong cơ sở dữ liệu admin. Khi thí sinh bấm gửi từ
            <a class="inline-link" href="dang-ky.html">trang đăng ký</a>,
            dữ liệu sẽ xuất hiện tại đây.`;
    return;
  }

  emptyState.hidden = true;

  visibleSubmissions.forEach(function (item) {
    const card = document.createElement("details");
    card.className = "data-card";
    card.innerHTML = `
      <summary>
        <div class="data-card-head">
          <div>
            <h3>${escapeHtml(item.fullName)}</h3>
            <p>${escapeHtml(item.email)} | ${escapeHtml(item.phone)}</p>
          </div>
          <span class="date">${escapeHtml(formatDateTime(item.submittedAt))}</span>
        </div>
      </summary>
      <div class="data-card-body">
        <div class="data-grid">
          <div><strong>Năm sinh</strong><span>${escapeHtml(item.birthYear)}</span></div>
          <div><strong>Tỉnh / Thành phố</strong><span>${escapeHtml(item.city)}</span></div>
          <div><strong>Trường học / Công việc</strong><span>${escapeHtml(item.occupation)}</span></div>
          <div><strong>Khả năng tham gia</strong><span>${escapeHtml(item.availability || "Chưa có")}</span></div>
        </div>
        <div class="data-block">
          <strong>Giới thiệu bản thân</strong>
          <p>${escapeHtml(item.identity || "Không cung cấp")}</p>
        </div>
        <div class="data-block">
          <strong>Động lực tham gia</strong>
          <p>${escapeHtml(item.motivation)}</p>
        </div>
        <div class="data-block">
          <strong>Góc nhìn về chủ đề</strong>
          <p>${escapeHtml(item.story)}</p>
        </div>
        <div class="data-block">
          <strong>Điểm mạnh</strong>
          <p>${escapeHtml(item.strength)}</p>
        </div>
        <div class="data-block">
          <strong>Mong muốn nhận được</strong>
          <p>${escapeHtml(item.expectation.length ? item.expectation.join(", ") : "Không chọn")}</p>
        </div>
      </div>
    `;
    submissionList.appendChild(card);
  });
}

if (loginForm && loginMessage) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginMessage.classList.remove("show", "error");

    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;

    try {
      await apiRequest("admin_login", {
        method: "POST",
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      window.location.href = "admin.html";
      return;
    } catch (error) {
      loginMessage.textContent = error.message || "Đăng nhập không thành công. Vui lòng thử lại.";
      loginMessage.classList.add("error", "show");
    }
  });
}

if (registrationForm && successMessage) {
  registrationForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!registrationForm.checkValidity()) {
      registrationForm.reportValidity();
      return;
    }

    const payload = collectFormData(registrationForm);
    successMessage.classList.remove("show", "error");

    try {
      await apiRequest("create_submission", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      successMessage.textContent =
        "Đã gửi đăng ký thành công.";
      successMessage.classList.add("show");
      registrationForm.reset();
      registrationForm.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      successMessage.textContent =
        "Khong gui duoc du lieu len server. Vui long kiem tra Vercel, Supabase va route /api.";
      successMessage.classList.add("error", "show");
    }
  });
}

document.addEventListener("click", async function (event) {
  const logoutControl = event.target.closest('button[data-auth-action="logout"], #logoutButton');

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

  window.location.href = "login.html";
});

if (hideDataBtn) {
  hideDataBtn.addEventListener("click", async function () {
    let submissions = [];

    try {
      submissions = await fetchSubmissions();
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
      await renderSubmissionList();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      window.alert("Khong an duoc du lieu tren server.");
    }
  });
}

if (restoreDataBtn) {
  restoreDataBtn.addEventListener("click", async function () {
    try {
      await apiRequest("restore_all_submissions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await renderSubmissionList();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      window.alert("Khong hien lai du lieu tren server.");
    }
  });
}

if (exportExcelBtn) {
  exportExcelBtn.addEventListener("click", async function () {
    let visibleSubmissions = [];

    try {
      visibleSubmissions = getVisibleSubmissions(await fetchSubmissions());
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
  });
}

async function initializePage() {
  setupBackgroundMusic();
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
