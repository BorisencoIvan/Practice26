import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutGrid,
  Users,
  Boxes,
  Route as RouteIcon,
  Wallet,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
} from "lucide-react";

const T = {
  ink: "#12161F",
  inkSoft: "#2A303C",
  paper: "#EEF1EF",
  card: "#F8FAF9",
  line: "#D8DDD9",
  amber: "#C4832F",
  teal: "#2F6F5E",
  rust: "#B1503D",
  textMuted: "#6B7178",
};

const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  "https://speakers-leon-solar-lucas.trycloudflare.com/api/v1"
).replace(/\/$/, "");

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Запрос согласно правилам контракта
async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      method: "GET",
      ...options,
    });
  } catch (_err) {
    throw new ApiError(0, "Бэкенд недоступен. Проверьте запуск сервера.");
  }

  const contentType = res.headers.get("content-type") || "";

  // Проверка формата JSON (предотвращает Unexpected token '<')
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      res.status || 404,
      `Эндпоинт ${path} вернул non-JSON ответ`
    );
  }

  const data = await res.json();

  if (!res.ok) {
    // В ответах строго одно поле `error` для ошибок
    const errorMessage = data && typeof data.error === "string" ? data.error : null;

    // Стандартные расшифровки кодов из правил контракта
    if (!errorMessage) {
      if (res.status === 422) throw new ApiError(422, "Некорректные входные данные (422)");
      if (res.status === 404) throw new ApiError(404, "Ресурс не найден (404)");
      if (res.status === 409) throw new ApiError(409, "Конфликт бизнес-логики (409)");
      if (res.status === 500) throw new ApiError(500, "Внутренняя ошибка сервера (500)");
      throw new ApiError(res.status, `Ошибка сервера (${res.status})`);
    }

    throw new ApiError(res.status, errorMessage);
  }

  return data;
}

function friendlyErrorMessage(errs) {
  const messages = Array.isArray(errs) ? errs : [errs];
  const unique = [...new Set(messages.map((e) => e?.message || String(e)))];
  return unique.join(" | ");
}

// Форматирование денежных значений (поддержка чисел и числовых строк)
function fmtMDL(value) {
  if (value === null || value === undefined) return "0 MDL";
  const num = typeof value === "number" ? value : parseFloat(value);
  return new Intl.NumberFormat("ru-RU").format(Math.round(isNaN(num) ? 0 : num)) + " MDL";
}

// Парсинг дат стандарта ISO 8601
function fmtDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function agingBucket(days) {
  if (days <= 30) return "0–30 дней";
  if (days <= 60) return "31–60 дней";
  return "более 60 дней";
}

const EMPTY_SUMMARY = {
  todaySales: 0,
  monthSales: 0,
  pendingOrders: 0,
  activeRoutes: 0,
  totalReceivable: 0,
  overdueInvoicesCount: 0,
  salesDelta: undefined,
  pendingOrdersList: [],
  activeRoutesList: [],
  salesSeries: [],
  topClients: [],
  topProducts: [],
};

function normalizeSalesSeries(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    label: row.label || fmtDate(row.date || row.day || row.period),
    vanzari: Number(row.vanzari ?? row.sales ?? row.value ?? row.amount ?? 0),
  }));
}

function ErrorBanner({ message, onRetry, loading }) {
  if (!message) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 16px",
        marginBottom: "24px",
        fontSize: "13px",
        background: "#FBF1EC",
        border: `1px solid ${T.rust}`,
        color: T.rust,
      }}
    >
      <span>
        <strong>Внимание:</strong> {message}. Данные из сервера не загружены.
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={loading}
          style={{
            fontSize: "12px",
            padding: "4px 10px",
            border: `1px solid ${T.rust}`,
            color: T.rust,
            background: "transparent",
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <RefreshCw size={12} className={loading ? "spin" : ""} />
          {loading ? "Загрузка..." : "Повторить"}
        </button>
      )}
    </div>
  );
}

function KpiCard({ accent, icon, title, primary, secondary, delta, deltaLabel, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? "#F1EEE6" : T.card,
        borderTop: `3px solid ${accent}`,
        borderLeft: `1px solid ${active ? accent : T.line}`,
        borderRight: `1px solid ${active ? accent : T.line}`,
        borderBottom: `1px solid ${active ? accent : T.line}`,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "10px",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: T.textMuted, letterSpacing: "0.03em" }}>
          {title}
        </span>
        <div style={{ color: accent, flexShrink: 0 }}>{icon}</div>
      </div>

      <div style={{ fontSize: "18px", fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {primary}
      </div>

      {secondary && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "8px",
            borderTop: `1px solid ${T.line}`,
          }}
        >
          <span style={{ fontSize: "11px", color: T.textMuted }}>{secondary.label}</span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: T.inkSoft }}>{secondary.value}</span>
        </div>
      )}

      {delta !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "2px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 600,
              color: delta >= 0 ? T.teal : T.rust,
            }}
          >
            {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(delta)}%
          </span>
          <span style={{ fontSize: "11px", color: T.textMuted }}>{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

function RankTable({ title, rows, valueFmt }) {
  const max = Math.max(...rows.map((r) => Number(r.value) || 1), 1);
  return (
    <div style={{ flex: "1 1 320px", background: T.card, border: `1px solid ${T.line}` }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "8px 20px" }}>
        {rows.length === 0 && (
          <div style={{ padding: "16px 0", fontSize: "13px", color: T.textMuted }}>
            Нет данных в базе
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.name || i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 0",
              borderBottom: i < rows.length - 1 ? `1px solid ${T.line}` : "none",
            }}
          >
            <span style={{ fontSize: "12px", width: "20px", color: T.textMuted, textAlign: "right" }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", color: T.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.name}
              </div>
              <div style={{ height: "4px", background: T.line, width: "100%", marginTop: "6px" }}>
                <div style={{ height: "100%", width: `${(r.value / max) * 100}%`, background: T.amber }} />
              </div>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>
              {valueFmt(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: T.ink, color: T.paper, padding: "8px 12px", fontSize: "12px" }}>
      <div style={{ opacity: 0.7, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{fmtMDL(payload[0].value)}</div>
    </div>
  );
}

function DrillPanel({ kpi, summary, ordersData, routesData, agingData, onClose }) {
  if (!kpi) return null;

  let content = null;

  if (kpi === "orders") {
    content = {
      title: "Заказы в ожидании",
      cols: ["Заказ", "Клиент", "Сумма", "В ожидании"],
      rows: ordersData.map((o) => [
        o.id,
        o.client,
        fmtMDL(o.value),
        `${o.days} дн.`,
      ]),
    };
  } else if (kpi === "routes") {
    content = {
      title: "Активные маршруты",
      cols: ["Маршрут", "Водитель", "Остановки", "Статус"],
      rows: routesData.map((r) => [
        r.id,
        r.driver,
        `${r.stops} точек`,
        r.status,
      ]),
    };
  } else if (kpi === "receivable") {
    const list = agingData || [];
    content = {
      title: "Отчет по дебиторской задолженности",
      cols: ["Счет-фактура", "Клиент", "Дата выписки (ISO 8601)", "Сумма", "Просрочка"],
      rows: list.map((f) => [
        f.no || f.invoiceNo || f.id,
        f.client || f.clientName,
        fmtDate(f.issuedAt || f.date),
        fmtMDL(f.value || f.amount),
        agingBucket(f.agingDays || f.daysOverdue || 0),
      ]),
    };
  }

  if (!content) return null;

  return (
    <section style={{ marginBottom: "32px", background: T.card, border: `1px solid ${T.line}` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>{content.title}</h3>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${T.line}`,
            color: T.textMuted,
            padding: "4px 8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
          }}
        >
          <X size={14} /> Закрыть
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {content.cols.map((c) => (
                <th
                  key={c}
                  style={{
                    textAlign: "left",
                    padding: "10px 20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: T.textMuted,
                    borderBottom: `1px solid ${T.line}`,
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      padding: "12px 20px",
                      color: j === 0 ? T.ink : T.inkSoft,
                      borderBottom: i < content.rows.length - 1 ? `1px solid ${T.line}` : "none",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SupplierDashboard() {
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const [summaryData, setSummaryData] = useState(EMPTY_SUMMARY);
  const [ordersData, setOrdersData] = useState([]);
  const [routesData, setRoutesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [agingData, setAgingData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setApiError(null);

    const errors = [];

    // GET /api/v1/dashboard/summary
    try {
      const summary = await apiFetch("/dashboard/summary");
      if (summary) {
        setSummaryData({
          ...EMPTY_SUMMARY,
          ...(summary.summary || {}),
          salesSeries: summary.salesSeries || [],
          topClients: summary.topClients || [],
          topProducts: summary.topProducts || [],
        });
      }
    } catch (err) {
      errors.push(err);
    }

    // GET /api/v1/reports/aging
    try {
      const aging = await apiFetch("/reports/aging");
      if (aging) setAgingData(aging.overdueInvoices || aging);
    } catch (err) {
      errors.push(err);
    }

    // GET /api/v1/orders?status=pending
    try {
      const orders = await apiFetch("/orders?status=pending");
      setOrdersData(Array.isArray(orders) ? orders : orders.orders || []);
    } catch (err) {
      errors.push(err);
    }

    // GET /api/v1/routes?status=active
    try {
      const routes = await apiFetch("/routes?status=active");
      setRoutesData(Array.isArray(routes) ? routes : routes.routes || []);
    } catch (err) {
      errors.push(err);
    }

    // GET /api/v1/products?limit=10
    try {
      const products = await apiFetch("/products?limit=10");
      setProductsData(Array.isArray(products) ? products : products.products || []);
    } catch (err) {
      errors.push(err);
    }

    if (errors.length > 0) {
      setApiError(friendlyErrorMessage(errors));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const series = useMemo(
    () => normalizeSalesSeries(summaryData.salesSeries).slice(-rangeDays),
    [summaryData.salesSeries, rangeDays]
  );

  const toggleKpi = (key) => setSelectedKpi((cur) => (cur === key ? null : key));

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        background: T.paper,
        fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Боковое меню */}
      <aside
        style={{
          width: "220px",
          background: T.ink,
          color: T.paper,
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "32px", paddingLeft: "8px" }}>
            Поставщик
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { icon: <LayoutGrid size={16} />, label: "Общий панель", active: true },
              { icon: <Users size={16} />, label: "Клиенты" },
              { icon: <Boxes size={16} />, label: "Товары" },
              { icon: <RouteIcon size={16} />, label: "Маршруты" },
              { icon: <Wallet size={16} />, label: "Платежи" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  color: item.active ? T.paper : "#8B94A3",
                  background: item.active ? "#1E2530" : "transparent",
                  borderLeft: item.active ? `3px solid ${T.amber}` : "3px solid transparent",
                  cursor: "pointer",
                }}
              >
                {item.icon}
                {item.label}
              </div>
            ))}
          </nav>
        </div>
        <div style={{ fontSize: "12px", color: "#5C6473", paddingLeft: "8px" }}>
          Арпенти Алексей
        </div>
      </aside>

      {/* Главный контент */}
      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 600, color: T.ink, margin: 0 }}>
              Панель управления поставщика
            </h1>
          </div>
          <div style={{ fontSize: "12px", padding: "6px 12px", border: `1px solid ${T.line}`, color: T.textMuted }}>
            {new Date().toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        <ErrorBanner message={apiError} onRetry={loadData} loading={loading} />

        {/* Сетка 4 карточки в ряд */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <KpiCard
            accent={T.amber}
            icon={<TrendingUp size={16} />}
            title="ПРОДАЖИ"
            primary={fmtMDL(summaryData.todaySales)}
            secondary={{ label: "за месяц", value: fmtMDL(summaryData.monthSales) }}
            delta={summaryData.salesDelta}
            deltaLabel="к прошлому месяцу"
          />
          <KpiCard
            accent={T.inkSoft}
            icon={<Clock size={16} />}
            title="ЗАКАЗЫ В ОЖИДАНИИ"
            primary={summaryData.pendingOrders}
            secondary={{ label: "среднее / день", value: "—" }}
            onClick={() => toggleKpi("orders")}
            active={selectedKpi === "orders"}
          />
          <KpiCard
            accent={T.teal}
            icon={<RouteIcon size={16} />}
            title="АКТИВНЫЕ МАРШРУТЫ"
            primary={summaryData.activeRoutes}
            secondary={{ label: "водители на линии", value: "—" }}
            onClick={() => toggleKpi("routes")}
            active={selectedKpi === "routes"}
          />
          <KpiCard
            accent={T.rust}
            icon={<Wallet size={16} />}
            title="ОБЩАЯ СУММА К ПОЛУЧЕНИЮ"
            primary={fmtMDL(summaryData.totalReceivable)}
            secondary={{ label: "просроченные счета", value: summaryData.overdueInvoicesCount }}
            onClick={() => toggleKpi("receivable")}
            active={selectedKpi === "receivable"}
          />
        </section>

        <DrillPanel
          kpi={selectedKpi}
          summary={summaryData}
          ordersData={ordersData}
          routesData={routesData}
          agingData={agingData}
          onClose={() => setSelectedKpi(null)}
        />

        {/* График динамики продаж */}
        <section style={{ marginBottom: "32px", padding: "20px", background: T.card, border: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>
              Динамика продаж — последние {rangeDays} дней
            </h3>
            <div style={{ display: "flex", gap: "4px" }}>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d)}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    cursor: "pointer",
                    color: rangeDays === d ? T.paper : T.textMuted,
                    background: rangeDays === d ? T.ink : "transparent",
                    border: `1px solid ${rangeDays === d ? T.ink : T.line}`,
                  }}
                >
                  {d}д
                </button>
              ))}
            </div>
          </div>
          {series.length === 0 ? (
            <div style={{ height: "260px", display: "grid", placeItems: "center", color: T.textMuted, fontSize: "13px" }}>
              Нет данных о продажах в базе
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillVanzari" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.amber} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={T.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.line} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: T.textMuted }}
                  axisLine={{ stroke: T.line }}
                  tickLine={false}
                  interval={rangeDays <= 7 ? 0 : rangeDays <= 30 ? 3 : 9}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: T.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="vanzari" stroke={T.amber} strokeWidth={2} fill="url(#fillVanzari)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Таблицы Топ-10 */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <RankTable title="Топ-10 клиентов" rows={summaryData.topClients} valueFmt={fmtMDL} />
          <RankTable title="Топ-10 товаров" rows={productsData} valueFmt={(v) => `${v} шт.`} />
        </section>
      </main>
    </div>
  );
}