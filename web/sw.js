const VERSION = "aifn-shell-v4";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/components/app-shell.html",
  "/components/app-shell.html",
  "/components/function-editor.html",
  "/pages/landing-page.html",
  "/pages/dashboard-page.html",
  "/pages/functions-page.html",
  "/pages/function-editor-page.html",
  "/pages/help-page.html",
  "/pages/provider-settings-page.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;
  event.respondWith(fetch(request).catch(() => caches.match(request).then((response) => response || caches.match("/index.html"))));
});
