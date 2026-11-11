const fs = require('fs');
const crypto = require('crypto');
const dir = __dirname;
const read = f => fs.readFileSync(dir + '/' + f, 'utf8');
const logo = '<img src="icons/favicon.svg" alt="" width="40" height="40">';
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b5e43" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a3023" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<meta name="description" content="Estoque, compras, vendas e parcelas de cestas básicas. Funciona sem internet.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cestas">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<title>Controle de Cestas</title>
<style>
${read('styles.css')}
</style>
</head>
<body>
<div id="gate" hidden></div>
<div class="shell">
  <aside class="side">
    <div class="side-brand">${logo}<div><b>Controle de Cestas</b><small>Estoque, vendas e parcelas</small></div></div>
    <nav class="tabs" id="tabs" aria-label="Seções do app"></nav>
  </aside>
  <div class="main">
    <header class="top">
      <div class="brand">${logo}<div><h1>Controle de Cestas</h1><span>Estoque, compras, vendas e parcelas</span></div></div>
      <div class="top-actions">
        <button class="chip install" id="installBtn" type="button" hidden>Instalar app</button>
        <button class="chip" id="syncChip" type="button" data-act="go" data-tab="cadastros" aria-label="Nuvem"></button>
      </div>
    </header>
    <div class="wrap">
      <div id="saveWarn" role="alert"></div>
      <div id="alerts"></div>
      <main id="view"></main>
    </div>
  </div>
</div>
<div id="toast" role="status" aria-live="polite"></div>
<script>
${read('engine.js')}
</script>
<script>
${read('sync.js')}
</script>
<script>
${read('app.js')}
</script>
<script>
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
</script>
</body>
</html>
`;
fs.writeFileSync(dir + '/index.html', html);
const build = crypto.createHash('sha1').update(html).update(read('manifest.webmanifest')).digest('hex').slice(0, 10);
fs.writeFileSync(dir + '/sw.js', read('sw.template.js').replace('__BUILD__', build));
console.log('index.html gerado: ' + Math.round(html.length / 1024) + ' KB | sw.js build ' + build);

// pasta pronta para hospedar (Vercel, GitHub Pages etc.)
const out = dir + '/dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out + '/icons', { recursive: true });
['index.html', 'sw.js', 'manifest.webmanifest'].forEach(f => fs.copyFileSync(dir + '/' + f, out + '/' + f));
fs.readdirSync(dir + '/icons').filter(f => /\.(png|svg)$/.test(f) && f !== 'maskable.svg').forEach(f => fs.copyFileSync(dir + '/icons/' + f, out + '/icons/' + f));
console.log('dist/ pronto para publicar');
