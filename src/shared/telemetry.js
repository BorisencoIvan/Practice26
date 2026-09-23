const RECENT_LIMIT = 200;

const state = {
  startedAt: Date.now(),
  total: 0,
  byStatusClass: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  byOrigin: Object.create(null),
  byPath: Object.create(null),
  recent: [],
  lastRequestAt: null
};

const listeners = new Set();

function emit(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of listeners) {
    try {
      res.write(payload);
    } catch (_error) {
      listeners.delete(res);
    }
  }
}

function subscribe(res) {
  listeners.add(res);
  return () => listeners.delete(res);
}

function key(path) {
  return path.replace(/\/\d+(?=\/|$)/g, '/:id');
}

function middleware(req, res, next) {
  if (req.path === '/monitor' || req.path.startsWith('/monitor/')) {
    return next();
  }

  const started = Date.now();
  let errorInfo = null;
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 400 && body && typeof body === 'object') {
      errorInfo = {
        error: typeof body.error === 'string' ? body.error : null,
        code: body.code ? String(body.code) : null
      };
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = Date.now() - started;
    const status = res.statusCode;
    const origin = req.headers.origin || '(no origin)';
    const pathKey = key(req.path);

    state.total += 1;
    state.lastRequestAt = Date.now();

    const cls = `${Math.floor(status / 100)}xx`;
    if (state.byStatusClass[cls] !== undefined) {
      state.byStatusClass[cls] += 1;
    }

    state.byOrigin[origin] = (state.byOrigin[origin] || 0) + 1;
    const pk = `${req.method} ${pathKey}`;
    state.byPath[pk] = (state.byPath[pk] || 0) + 1;

    const entry = {
      ts: Date.now(),
      method: req.method,
      path: req.originalUrl,
      status,
      origin,
      ip: req.headers['cf-connecting-ip'] || req.ip,
      ms: duration,
      error: errorInfo?.error || null,
      code: errorInfo?.code || null
    };

    state.recent.unshift(entry);
    if (state.recent.length > RECENT_LIMIT) {
      state.recent.length = RECENT_LIMIT;
    }

    emit('request', entry);
  });

  next();
}

function snapshot() {
  return {
    startedAt: state.startedAt,
    uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
    total: state.total,
    byStatusClass: { ...state.byStatusClass },
    byOrigin: { ...state.byOrigin },
    byPath: Object.fromEntries(
      Object.entries(state.byPath).sort((a, b) => b[1] - a[1]).slice(0, 20)
    ),
    lastRequestAt: state.lastRequestAt,
    recent: state.recent.slice(0, 50)
  };
}

module.exports = { middleware, snapshot, subscribe, emit };
