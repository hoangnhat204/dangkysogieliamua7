self.addEventListener("push", function (event) {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  const title = payload.title || "Sogielia Mùa 7";
  const body = payload.body || "Có thí sinh mới đăng ký.";
  const url = payload.url || "/admin.html";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      data: {
        url: url,
      },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  const data = event.notification && event.notification.data ? event.notification.data : {};
  const targetUrl = data.url || "/admin.html";

  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.endsWith("/admin.html") || clientUrl.pathname.endsWith("/admin")) {
            return client.focus();
          }
        } catch (error) {
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
