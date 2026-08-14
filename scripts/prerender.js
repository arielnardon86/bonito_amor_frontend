/**
 * Prerender: genera HTML estático de las páginas públicas de marketing
 * dentro de build/, para que crawlers que no ejecutan JavaScript
 * (GPTBot, ClaudeBot, PerplexityBot, etc.) vean el contenido real
 * y no el shell vacío "You need to enable JavaScript to run this app".
 *
 * Corre como parte de `npm run build` (ver package.json). No toca rutas
 * de la app autenticada: esas ya están bloqueadas en robots.txt.
 *
 * Para agregar una página nueva: sumarla a ROUTES y asegurarse de que
 * su contenido renderice sin depender de sesión/autenticación.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const PORT = 45123;

const ROUTES = [
  '/',
];

// Selector que confirma que HomePage ya terminó de renderizar (no el spinner de "Cargando...").
const READY_SELECTOR = '#inicio';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(BUILD_DIR, urlPath);

    // Emula el rewrite catch-all de producción: si el path no matchea
    // un archivo real, se sirve index.html (comportamiento de SPA).
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(BUILD_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function prerenderRoute(browser, route) {
  const page = await browser.newPage();
  const url = `http://localhost:${PORT}${route}`;

  // Bloquea cualquier request que no sea al server local: evita que el build
  // dispare pageviews/conversiones reales en Google Analytics/Ads (gtag, doubleclick).
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().startsWith(`http://localhost:${PORT}`)) {
      req.continue();
    } else {
      req.abort();
    }
  });

  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector(READY_SELECTOR, { timeout: 10000 });

  const html = await page.content();
  await page.close();

  const outDir = route === '/' ? BUILD_DIR : path.join(BUILD_DIR, route);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);

  console.log(`  ✓ ${route} -> ${path.relative(BUILD_DIR, path.join(outDir, 'index.html')) || 'index.html'}`);
}

(async () => {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('No existe build/. Corré "react-scripts build" antes del prerender.');
    process.exit(1);
  }

  console.log('Prerenderizando páginas públicas...');

  const server = await startServer();
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    for (const route of ROUTES) {
      await prerenderRoute(browser, route);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('Listo.');
})().catch((err) => {
  console.error('Error en el prerender:', err);
  process.exit(1);
});
