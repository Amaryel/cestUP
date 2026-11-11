const fs = require('fs');
const dir = __dirname;
const read = f => fs.readFileSync(dir + '/' + f, 'utf8');
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1f7a45">
<meta name="color-scheme" content="light dark">
<title>Controle de Cestas</title>
<style>
${read('styles.css')}
</style>
</head>
<body>
<header class="top"><h1>Controle de Cestas</h1><span>Estoque, compras, vendas e parcelas</span></header>
<div class="wrap">
  <div id="saveWarn" role="alert"></div>
  <div id="alerts"></div>
  <main id="view"></main>
</div>
<nav class="tabs" id="tabs" aria-label="Seções do app"></nav>
<div id="toast" role="status" aria-live="polite"></div>
<script>
${read('engine.js')}
</script>
<script>
${read('seed.js')}
</script>
<script>
${read('app.js')}
</script>
</body>
</html>
`;
fs.writeFileSync(dir + '/index.html', html);
console.log('index.html gerado: ' + Math.round(html.length / 1024) + ' KB');
