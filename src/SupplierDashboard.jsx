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
} from "lucide-react";

// Цветовые токены
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

const API_BASE = "/api/v1";

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Защищенный забор данных: перехватывает HTML вместо JSON до ошибки парсинга
async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (_err) {
    throw new ApiError(0, "Бэкенд недоступен. Проверьте запуск сервера.");
  }

  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new ApiError(
      res.status || 404,
      `API роут ${path} вернул HTML/текст вместо JSON.`
    );
  }

  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch (_e) {}
    throw new ApiError(res.status, msg);
  }

  return res.json();
}

function friendlyErrorMessage(err) {
  if (err.status === 0) return err.message;
  if (err.status === 404) return "Эндпоинт API не найден (404).";
  if (err.status === 500) return "Внутренняя ошибка сервера (500).";
  return err.message || "Ошибка загрузки данных.";
}

function ErrorBanner({ message, onRetry }) {
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
        <strong>Внимание:</strong> {message} Отображаются демонстрационные данные.
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            fontSize: "12px",
            padding: "4px 10px",
            border: `1px solid ${T.rust}`,
            color: T.rust,
            background: "transparent",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Повторить
        </button>
      )}
    </div>
  );
}

function buildSeries(days = 90) {
  const out = [];
  let base = 42000;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    base += Math.round((Math.random() - 0.42) * 4000);
    base = Math.max(base, 18000);
    out.push({
      label: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      vanzari: base,
    });
  }
  return out;
}

const TOP_CLIENTS = [
  { name: "Fabrica Sud SRL", value: 184200 },
  { name: "Nord Distribuție", value: 162900 },
  { name: "AgroPlus Chișinău", value: 149500 },
  { name: "Metalcom Bălți", value: 133700 },
  { name: "Vector Trading", value: 121300 },
  { name: "Prim Construct", value: 108600 },
  { name: "EuroLogistic", value: 97400 },
  { name: "Bunătăți Casei", value: 88100 },
  { name: "Terra Import", value: 76300 },
  { name: "OptimStar", value: 64900 },
];

const TOP_PRODUCTS = [
  { name: "Цемент Портланд 42.5", value: 96 },
  { name: "Профиль металлический 40x40", value: 88 },
  { name: "Краска фасадная 15л", value: 81 },
  { name: "Плита OSB 18мм", value: 74 },
  { name: "Кабель электрический 2x1.5", value: 69 },
  { name: "Труба ПВХ 110мм", value: 63 },
  { name: "Масло гидравлическое 20л", value: 57 },
  { name: "Блок газобетонный 60x30", value: 51 },
  { name: "Фитинги (комплект)", value: 44 },
  { name: "Клей для плитки 25кг", value: 38 },
];

function fmtMDL(value) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("ru-RU").format(Math.round(num)) + " MDL";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", {
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

const PENDING_ORDERS = [
  { id: "CMD-1042", client: "Fabrica Sud SRL", value: 18400, days: 1 },
  { id: "CMD-1041", client: "Vector Trading", value: 9200, days: 1 },
  { id: "CMD-1039", client: "AgroPlus Chișinău", value: 27600, days: 2 },
  { id: "CMD-1035", client: "Terra Import", value: 5400, days: 3 },
  { id: "CMD-1030", client: "Metalcom Bălți", value: 14100, days: 4 },
];

const ACTIVE_ROUTES = [
  { id: "R-08", driver: "В. Чеботарь", stops: 6, status: "в пути" },
  { id: "R-05", driver: "И. Постолаки", stops: 4, status: "в пути" },
  { id: "R-11", driver: "Н. Гуцу", stops: 8, status: "погрузка" },
  { id: "R-03", driver: "С. Руссу", stops: 3, status: "в пути" },
];

const OVERDUE_INVOICES = [
  { no: "FCT-2231", client: "Nord Distribuție", value: "22100.00", issuedAt: "2026-07-10T09:00:00.000Z", agingDays: 74 },
  { no: "FCT-2214", client: "Prim Construct", value: "15600.00", issuedAt: "2026-08-02T09:00:00.000Z", agingDays: 51 },
  { no: "FCT-2198", client: "EuroLogistic", value: "9800.00", issuedAt: "2026-08-15T09:00:00.000Z", agingDays: 38 },
  { no: "FCT-2180", client: "OptimStar", value: "12300.00", issuedAt: "2026-08-31T09:00:00.000Z", agingDays: 22 },
  { no: "FCT-2177", client: "Bunătăți Casei", value: "6700.00", issuedAt: "2026-09-10T09:00:00.000Z", agingDays: 12 },
];

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

      <div style={{ fontSize: "20px", fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
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
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div style={{ flex: "1 1 320px", background: T.card, border: `1px solid ${T.line}` }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "8px 20px" }}>
        {rows.map((r, i) => (
          <div
            key={r.name}
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

function DrillPanel({ kpi, onClose }) {
  if (!kpi) return null;

  const content = {
    orders: {
      title: "Заказы в ожидании",
      rows: PENDING_ORDERS.map((o) => [o.id, o.client, fmtMDL(o.value), `${o.days} дн.`]),
      cols: ["Заказ", "Клиент", "Сумма", "В ожидании"],
    },
    routes: {
      title: "Активные маршруты",
      rows: ACTIVE_ROUTES.map((r) => [r.id, r.driver, `${r.stops} точек`, r.status]),
      cols: ["Маршрут", "Водитель", "Остановки", "Статус"],
    },
    receivable: {
      title: "Детализация задолженностей",
      rows: OVERDUE_INVOICES.map((f) => [
        f.no,
        f.client,
        fmtDate(f.issuedAt),
        fmtMDL(f.value),
        agingBucket(f.agingDays),
      ]),
      cols: ["Счет-фактура", "Клиент", "Дата выписки", "Сумма", "Просрочка"],
    },
  }[kpi];

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
  const fullSeries = useMemo(() => buildSeries(90), []);
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [apiError, setApiError] = useState(null);

  const loadDashboard = () => {
    setApiError(null);
    apiFetch("/dashboard/summary").catch((err) => {
      setApiError(friendlyErrorMessage(err));
    });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const series = useMemo(
    () => fullSeries.slice(fullSeries.length - rangeDays),
    [fullSeries, rangeDays]
  );

  const todaySales = fullSeries[fullSeries.length - 1].vanzari;
  const monthSales = 450000;
  const pendingOrders = 34;
  const activeRoutes = 12;
  const totalReceivable = "120500.00";

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

        <ErrorBanner message={apiError} onRetry={loadDashboard} />

        {/* Ровная сетка 4 в ряд */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <KpiCard
            accent={T.amber}
            icon={<TrendingUp size={16} />}
            title="ПРОДАЖИ"
            primary={fmtMDL(todaySales)}
            secondary={{ label: "за месяц", value: fmtMDL(monthSales) }}
            delta={12}
            deltaLabel="к прошлому месяцу"
          />
          <KpiCard
            accent={T.inkSoft}
            icon={<Clock size={16} />}
            title="ЗАКАЗЫ В ОЖИДАНИИ"
            primary={pendingOrders}
            secondary={{ label: "среднее / день", value: "4" }}
            onClick={() => toggleKpi("orders")}
            active={selectedKpi === "orders"}
          />
          <KpiCard
            accent={T.teal}
            icon={<RouteIcon size={16} />}
            title="АКТИВНЫЕ МАРШРУТЫ"
            primary={activeRoutes}
            secondary={{ label: "водители на линии", value: "9" }}
            onClick={() => toggleKpi("routes")}
            active={selectedKpi === "routes"}
          />
          <KpiCard
            accent={T.rust}
            icon={<Wallet size={16} />}
            title="ОБЩАЯ СУММА К ПОЛУЧЕНИЮ"
            primary={fmtMDL(totalReceivable)}
            secondary={{ label: "просроченные счета", value: "18" }}
            onClick={() => toggleKpi("receivable")}
            active={selectedKpi === "receivable"}
          />
        </section>

        <DrillPanel kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />

        {/* График продаж */}
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
        </section>

        {/* Таблицы "Топ-10" */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <RankTable title="Топ-10 клиентов" rows={TOP_CLIENTS} valueFmt={fmtMDL} />
          <RankTable title="Топ-10 товаров" rows={TOP_PRODUCTS} valueFmt={(v) => `${v} шт.`} />
        </section>
      </main>
    </div>
  );
}