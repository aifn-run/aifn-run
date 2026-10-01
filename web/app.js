const app = document.querySelector("[data-app]");
if (location.pathname === "/editor") {
  history.replaceState({}, "", "/functions?view=function-editor");
}
const pageRoot = document.createElement("div");
pageRoot.id = "page-root";
app.append(pageRoot);

const routes = {
  "/": { template: "/pages/landing-page.html", component: "landing-page" },
  "/dashboard": { template: "/pages/dashboard-page.html", component: "dashboard-page" },
  "/functions": { template: "/pages/functions-page.html", component: "functions-page", private: true },
  "/browse": { template: "/pages/search-page.html", component: "search-page" },
};
const route = routes[location.pathname] || routes["/"];
if (route.private) {
  const session = await fetch("/auth/session", { credentials: "include" })
    .then((response) => response.json())
    .catch(() => ({ profile: null }));
  if (!session.profile) {
    location.replace(`/auth/login?return_to=${encodeURIComponent(location.pathname)}`);
    throw new Error("Authentication required");
  }
}
const sources = ["/components/app-shell.html", route.template];

for (const source of sources) {
  const response = await fetch(source, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load ${source}`);
  }
  let html = await response.text();
  document.body.insertAdjacentHTML("afterbegin", html);
}

await import("@li3/web");
pageRoot.innerHTML = `<${route.component}></${route.component}>`;
