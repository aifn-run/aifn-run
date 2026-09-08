const sources = [
  "/components/app-shell.html",
];

if (location.pathname === "/workspace") {
  sources.push("/components/workspace-page.html", "/components/function-editor.html", "https://sodium.static.apphor.de/code-editor.html");
}

if (location.pathname === "/dashboard") {
  sources.push("/components/dashboard-page.html");
}

const templates = await Promise.all(sources.map(async (source) => {
  const response = await fetch(source);
  const html = await response.text();
  return source.includes("code-editor.html")
    ? html.replace('src="./code-editor.mjs"', 'src="https://sodium.static.apphor.de/code-editor.mjs"')
    : html;
}));
document.body.insertAdjacentHTML("afterbegin", templates.join("\n"));
await import("@li3/web");

const app = document.querySelector("[data-app]");
app.innerHTML = `
  <app-shell></app-shell>
  ${location.pathname === "/workspace" ? "<workspace-page></workspace-page>" : ""}
  ${location.pathname === "/dashboard" ? "<dashboard-page></dashboard-page>" : ""}
`;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js?v=2").catch(() => {});
}
