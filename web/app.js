const app = document.querySelector('[data-app]');
const pageRoot = document.createElement('div');
pageRoot.id = 'page-root';
app.append(pageRoot);

const routes = {
  '/': { template: '/pages/landing-page.html', component: 'landing-page' },
  '/dashboard': { template: '/pages/dashboard-page.html', component: 'dashboard-page' },
  '/functions': { template: '/pages/functions-page.html', component: 'functions-page', private: true },
  '/functions/new': { template: '/pages/function-editor-page.html', component: 'function-editor-page', editor: true, private: true },
  '/help': { template: '/pages/help-page.html', component: 'help-page' },
  '/settings/provider': { template: '/pages/provider-settings-page.html', component: 'provider-settings-page', private: true },
};
const route = routes[location.pathname] || routes['/'];
if (route.private) {
  const session = await fetch('/auth/session', { credentials: 'include' }).then((response) => response.json()).catch(() => ({ profile: null }));
  if (!session.profile) {
    location.replace(`/auth/login?return_to=${encodeURIComponent(location.pathname)}`);
    throw new Error('Authentication required');
  }
}
const sources = ['/components/app-shell.html', route.template];
if (route.editor) sources.push('/components/function-editor.html', 'https://sodium.static.apphor.de/code-editor.html');

for (const source of sources) {
  const response = await fetch(source, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${source}`);
  let html = await response.text();
  if (source.endsWith('code-editor.html')) html = html.replace('src="./code-editor.mjs"', 'src="https://sodium.static.apphor.de/code-editor.mjs"');
  document.body.insertAdjacentHTML('afterbegin', html);
}

await import('@li3/web');
pageRoot.innerHTML = `<${route.component}></${route.component}>`;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=6').catch(() => {});
