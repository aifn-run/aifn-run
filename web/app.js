const app = document.querySelector('[data-app]');
const pageRoot = document.createElement('div');
pageRoot.id = 'page-root';
app.append(pageRoot);

const routes = {
  '/': { template: '/pages/landing-page.html', component: 'landing-page' },
  '/dashboard': { template: '/pages/dashboard-page.html', component: 'dashboard-page' },
  '/functions': { template: '/pages/functions-page.html', component: 'functions-page' },
  '/functions/new': { template: '/pages/function-editor-page.html', component: 'function-editor-page' },
  '/help': { template: '/pages/help-page.html', component: 'help-page' },
  '/settings/provider': { template: '/pages/provider-settings-page.html', component: 'provider-settings-page' },
};
const templateSources = [
  '/components/app-shell.html',
  ...Object.values(routes).map((route) => route.template),
  '/components/function-editor.html',
  'https://sodium.static.apphor.de/code-editor.html',
];
const templates = new Map();

for (const source of templateSources) {
  const response = await fetch(source, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${source}`);
  let html = await response.text();
  if (source.endsWith('code-editor.html'))
    html = html.replace('src="./code-editor.mjs"', 'src="https://sodium.static.apphor.de/code-editor.mjs"');
  templates.set(source, html);
  document.body.insertAdjacentHTML('afterbegin', html);
}

await import('@li3/web');

async function navigate(path, replace = false) {
  const route = routes[path] || routes['/'];
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  pageRoot.innerHTML = `<${route.component}></${route.component}>`;
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || link.origin !== location.origin || !routes[link.pathname]) return;
  event.preventDefault();
  navigate(link.pathname);
});
window.addEventListener('popstate', () => navigate(location.pathname, true));
await navigate(location.pathname, true);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=5').catch(() => {});
