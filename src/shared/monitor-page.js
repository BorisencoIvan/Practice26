const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoicing backend — monitor</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-monospace, 'Cascadia Code', Consolas, monospace; background: #0d1117; color: #e6edf3; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; display: inline-block; }
  .live { font-size: 11px; padding: 3px 8px; border-radius: 10px; margin-left: 10px; vertical-align: middle; }
  .live.on { background: #1a3a24; color: #3fb950; }
  .live.on .dot { animation: pulse 1.5s infinite; }
  .live.warn { background: #3a2f1a; color: #d29922; }
  .live.off { background: #3a1a1a; color: #f85149; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
  .sub { color: #8b949e; font-size: 12px; margin: 0 0 20px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px; }
  .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8b949e; margin-bottom: 6px; }
  .card .value { font-size: 22px; font-weight: 700; }
  .ok { color: #3fb950; } .bad { color: #f85149; } .warn { color: #d29922; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
  .dot.ok { background: #3fb950; box-shadow: 0 0 8px #3fb950; }
  .dot.bad { background: #f85149; box-shadow: 0 0 8px #f85149; }
  section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
  section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #8b949e; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #21262d; }
  th { color: #8b949e; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .s2 { color: #3fb950; } .s3 { color: #8b949e; } .s4 { color: #d29922; } .s5 { color: #f85149; }
  .err { color: #f85149; } .code { color: #8b949e; } .muted { color: #6e7681; font-size: 11px; }
  details summary { cursor: pointer; color: #8b949e; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
  details[open] summary { margin-bottom: 10px; }
  tr.fresh { animation: flash 1s ease-out; }
  @keyframes flash { from { background: #1f6feb33; } to { background: transparent; } }
  #updated { position: fixed; top: 10px; right: 16px; font-size: 11px; color: #8b949e; }
</style>
</head>
<body>
<div id="updated"></div>
<h1>Invoicing backend — мониторинг</h1><span class="live off" id="conn"><span class="dot"></span>подключение…</span>
<div class="sub">Live-поток (SSE): запросы появляются в момент их обработки. Телеметрия живёт в памяти сервера и сбрасывается при рестарте.</div>

<div class="cards">
  <div class="card"><div class="label">Backend</div><div class="value" id="backend">…</div></div>
  <div class="card"><div class="label">Database</div><div class="value" id="db">…</div></div>
  <div class="card"><div class="label">Uptime</div><div class="value" id="uptime">—</div></div>
  <div class="card"><div class="label">Запросов всего</div><div class="value" id="total">—</div></div>
  <div class="card"><div class="label">Ошибок 4xx / 5xx</div><div class="value" id="errors">—</div></div>
  <div class="card"><div class="label">Последний запрос</div><div class="value" id="lastReq">—</div></div>
</div>

<section>
  <h2>Кто обращается (по Origin фронтенда)</h2>
  <table><thead><tr><th>Origin</th><th class="num">Запросов</th></tr></thead><tbody id="origins"></tbody></table>
</section>

<section>
  <h2>Топ эндпоинтов</h2>
  <table><thead><tr><th>Маршрут</th><th class="num">Запросов</th></tr></thead><tbody id="paths"></tbody></table>
</section>

<section>
  <h2>Последние запросы (live)</h2>
  <table><thead><tr><th>Время</th><th>Метод</th><th>Путь</th><th>Статус</th><th>Ошибка</th><th>Origin</th><th>IP</th><th class="num">мс</th></tr></thead><tbody id="recent"></tbody></table>
</section>

<section>
  <details>
    <summary>Словарь ошибок (нажми, чтобы развернуть)</summary>
    <table><thead><tr><th>Код</th><th>Что значит</th></tr></thead><tbody id="glossary"></tbody></table>
  </details>
</section>

<script>
const fmtUptime = (s) => {
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return (d ? d + 'д ' : '') + h + 'ч ' + m + 'м';
};
const ago = (ts) => ts ? Math.max(0, Math.round((Date.now() - ts) / 1000)) + 'с назад' : 'нет данных';
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = (ts) => new Date(ts).toLocaleTimeString('ru-RU');
const emptyRow = (cols) => '<tr><td colspan="' + cols + '" style="color:#8b949e">пока нет данных</td></tr>';

const CODE_INFO = {
  ENDPOINT_NOT_FOUND: 'Фронтенд запросил путь, которого на сервере нет — смотри колонку «Путь»',
  INVOICE_NOT_FOUND: 'Счёт с таким id не найден в БД',
  CLIENT_NOT_FOUND: 'Клиент с таким id не найден в БД',
  ORDER_NOT_FOUND: 'Заказ с таким id не найден в БД',
  ORDER_NOT_DELIVERED: 'Заказ ещё не доставлен — счёт можно создать только из доставленного',
  INVOICE_ALREADY_EXISTS_FOR_ORDER: 'На этот заказ счёт уже создан — повторное создание отклонено',
  INVALID_INVOICE_ID: 'Не передан числовой ID счёта: ожидается invoiceId, invoice_id, id или invoice.id. Ответ API содержит receivedFields',
  INVALID_CLIENT_ID: 'В запросе clientId отсутствует, не число или <= 0',
  INVALID_ORDER_ID: 'В запросе orderId отсутствует, не число или <= 0',
  INVALID_AMOUNT: 'Сумма оплаты не число, <= 0 или пустая',
  PAYMENT_EXCEEDS_INVOICE_TOTAL: 'Оплата больше, чем остаток по счёту',
  DATABASE_UNAVAILABLE: 'Сервер не может подключиться к Postgres (DATABASE_URL не задан или БД недоступна)',
  ECONNREFUSED: 'Postgres не отвечает — сервер БД выключен или неверен порт в DATABASE_URL',
  '28000': 'Postgres отклонил логин — неверный пользователь/пароль в DATABASE_URL',
  '3D000': 'Указанной базы данных не существует',
  '42P01': 'Запрос ссылается на таблицу, которой нет в БД — скорее всего не применена миграция',
  '42703': 'В БД нет такой колонки — схема устарела относительно кода',
  INTERNAL: 'Необработанная ошибка на сервере — подробности в консоли/логах процесса node'
};
const STATUS_INFO = {
  200: 'OK — запрос успешно выполнен',
  201: 'Created — ресурс создан',
  204: 'No Content — пустой ответ (обычно CORS-предзапрос OPTIONS)',
  304: 'Not Modified — данные не менялись, браузер использует свой кэш',
  400: 'Bad Request — запрос криво сформирован',
  401: 'Unauthorized — нужна авторизация',
  403: 'Forbidden — доступ запрещён',
  404: 'Not Found — путь не существует',
  405: 'Method Not Allowed — метод не поддерживается этим путём',
  409: 'Conflict — конфликт с текущим состоянием данных',
  422: 'Unprocessable — данные запроса невалидны',
  500: 'Internal Server Error — ошибка в коде сервера',
  502: 'Bad Gateway — туннель не дождался ответа от сервера',
  503: 'Service Unavailable — зависимость (БД) недоступна'
};
const codeTitle = (code) => CODE_INFO[code] || 'Код ошибки сервера';
const fmtErr = (q) => {
  if (q.error || (q.code && q.code !== String(q.status))) return fmtErrReal(q);
  const info = STATUS_INFO[q.status];
  if (q.status >= 400) return '<span class="err">' + esc(info || 'Ошибка') + ' (' + q.status + ')</span>';
  return '<span class="muted">' + esc(info || '—') + '</span>';
};
const fmtErrReal = (q) => {
  const code = q.code || q.status;
  const desc = CODE_INFO[code];
  const text = desc || q.error || 'Ошибка';
  return '<span title="' + esc(q.error || '') + '&#10;' + esc(codeTitle(code)) + '">' + esc(text) + '</span> <span class="code">(' + esc(code) + ')</span>';
};

const reqRow = (q, fresh) =>
  '<tr class="' + (fresh ? 'fresh' : '') + '"><td>' + time(q.ts) + '</td><td>' + esc(q.method) + '</td><td>' + esc(q.path) + '</td>' +
  '<td class="s' + Math.floor(q.status / 100) + '" title="' + (STATUS_INFO[q.status] || '') + '">' + q.status + '</td>' +
  '<td class="err">' + fmtErr(q) + '</td>' +
  '<td>' + esc(q.origin) + '</td><td>' + esc(q.ip) + '</td><td class="num">' + q.ms + '</td></tr>';

function renderStats(s) {
  document.getElementById('backend').innerHTML = '<span class="dot ok"></span><span class="ok">OK</span>';
  const dbEl = document.getElementById('db');
  if (s.db && s.db.ok) dbEl.innerHTML = '<span class="dot ok"></span><span class="ok">' + s.db.latencyMs + 'ms</span>';
  else dbEl.innerHTML = '<span class="dot bad"></span><span class="bad" title="' + esc(s.db && s.db.error || '') + '">НЕТ</span>';
  document.getElementById('uptime').textContent = fmtUptime(s.uptimeSeconds);
  document.getElementById('total').textContent = s.total;
  document.getElementById('errors').innerHTML =
    '<span class="' + (s.byStatusClass['4xx'] ? 'warn' : '') + '">' + s.byStatusClass['4xx'] + '</span> / ' +
    '<span class="' + (s.byStatusClass['5xx'] ? 'bad' : '') + '">' + s.byStatusClass['5xx'] + '</span>';
  document.getElementById('lastReq').textContent = ago(s.lastRequestAt);

  const origins = Object.entries(s.byOrigin || {});
  document.getElementById('origins').innerHTML = origins.length
    ? origins.map(([k, v]) => '<tr><td>' + esc(k) + '</td><td class="num">' + v + '</td></tr>').join('')
    : emptyRow(2);

  const paths = Object.entries(s.byPath || {});
  document.getElementById('paths').innerHTML = paths.length
    ? paths.map(([k, v]) => '<tr><td>' + esc(k) + '</td><td class="num">' + v + '</td></tr>').join('')
    : emptyRow(2);

  document.getElementById('recent').innerHTML = (s.recent || []).map((q) => reqRow(q, false)).join('') || emptyRow(8);
  document.getElementById('updated').textContent = 'поток обновлён ' + new Date().toLocaleTimeString('ru-RU');
}

function setConn(mode) {
  const conn = document.getElementById('conn');
  if (mode === 'live') { conn.className = 'live on'; conn.innerHTML = '<span class="dot"></span>live (SSE)'; }
  else if (mode === 'poll') { conn.className = 'live warn'; conn.innerHTML = '<span class="dot"></span>poll 1s (туннель буферизует поток)'; }
  else { conn.className = 'live off'; conn.innerHTML = '<span class="dot"></span>переподключение…'; }
}

let pollTimer = null;
let sseGotEvent = false;

async function pollOnce() {
  try {
    const r = await fetch('/monitor/stats', { cache: 'no-store' });
    renderStats(await r.json());
  } catch (_e) {
    setConn('off');
  }
}

function startPolling() {
  if (pollTimer) return;
  setConn('poll');
  pollOnce();
  pollTimer = setInterval(() => {
    if (sseGotEvent) { clearInterval(pollTimer); pollTimer = null; return; }
    pollOnce();
  }, 1000);
}

function connect() {
  const es = new EventSource('/monitor/stream');

  setConn('off');
  setTimeout(() => { if (!sseGotEvent) startPolling(); }, 3000);

  es.addEventListener('message', (e) => { if (e.data) markLive(); });
  es.addEventListener('stats', (e) => { markLive(); renderStats(JSON.parse(e.data)); });
  es.addEventListener('request', (e) => {
    markLive();
    const q = JSON.parse(e.data);
    const tbody = document.getElementById('recent');
    if (tbody.querySelector('td[colspan]')) tbody.innerHTML = '';
    tbody.insertAdjacentHTML('afterbegin', reqRow(q, true));
    while (tbody.children.length > 50) tbody.lastChild.remove();
    document.getElementById('lastReq').textContent = 'только что';
  });
  es.addEventListener('error', () => { if (!sseGotEvent) startPolling(); });

  function markLive() {
    sseGotEvent = true;
    setConn('live');
  }
}
document.getElementById('glossary').innerHTML = Object.entries(CODE_INFO)
  .map(([code, desc]) => '<tr><td class="code">' + esc(code) + '</td><td>' + esc(desc) + '</td></tr>').join('');

connect();
</script>
</body>
</html>`;

module.exports = { html };
