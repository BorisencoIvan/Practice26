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
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
} from "lucide-react";
import { ROUTE_DIRECTIONS, T } from "../dashboard/constants";
import { agingBucket, fmtMDL } from "../dashboard/utils";

export function ErrorBanner({ message, onRetry, loading }) {
  if (!message) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 16px", marginBottom: "24px", fontSize: "13px", background: "#FBF1EC", border: `1px solid ${T.rust}`, color: T.rust }}>
      <span><strong>Внимание:</strong> {message}. Данные из сервера не загружены.</span>
      <button onClick={onRetry} disabled={loading} style={{ fontSize: "12px", padding: "4px 10px", border: `1px solid ${T.rust}`, color: T.rust, background: "transparent", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
        <RefreshCw size={12} className={loading ? "spin" : ""} />
        {loading ? "Загрузка..." : "Повторить"}
      </button>
    </div>
  );
}

export function KpiCard({ accent, icon, title, primary, secondary, delta, deltaLabel, onClick, active }) {
  return (
    <div onClick={onClick} style={{ background: active ? "#F1EEE6" : T.card, borderTop: `3px solid ${accent}`, borderLeft: `1px solid ${active ? accent : T.line}`, borderRight: `1px solid ${active ? accent : T.line}`, borderBottom: `1px solid ${active ? accent : T.line}`, padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px", cursor: onClick ? "pointer" : "default", userSelect: "none", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: T.textMuted, letterSpacing: "0.03em" }}>{title}</span>
        <div style={{ color: accent, flexShrink: 0 }}>{icon}</div>
      </div>
      <div style={{ fontSize: "18px", fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primary}</div>
      {secondary && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: `1px solid ${T.line}` }}><span style={{ fontSize: "11px", color: T.textMuted }}>{secondary.label}</span><span style={{ fontSize: "12px", fontWeight: 600, color: T.inkSoft }}>{secondary.value}</span></div>}
      {delta !== undefined && <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingTop: "2px" }}><span style={{ display: "inline-flex", alignItems: "center", fontSize: "12px", fontWeight: 600, color: delta >= 0 ? T.teal : T.rust }}>{delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta)}%</span><span style={{ fontSize: "11px", color: T.textMuted }}>{deltaLabel}</span></div>}
    </div>
  );
}

export function RankTable({ title, rows, valueFmt }) {
  const max = Math.max(...rows.map((row) => Number(row.value) || 1), 1);
  return (
    <div style={{ flex: "1 1 320px", background: T.card, border: `1px solid ${T.line}` }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}><h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>{title}</h3></div>
      <div style={{ padding: "8px 20px" }}>
        {rows.length === 0 && <div style={{ padding: "16px 0", fontSize: "13px", color: T.textMuted }}>Нет данных в базе</div>}
        {rows.map((row, index) => <div key={row.name || index} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: index < rows.length - 1 ? `1px solid ${T.line}` : "none" }}><span style={{ fontSize: "12px", width: "20px", color: T.textMuted, textAlign: "right" }}>{index + 1}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: "13px", color: T.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div><div style={{ height: "4px", background: T.line, width: "100%", marginTop: "6px" }}><div style={{ height: "100%", width: `${(row.value / max) * 100}%`, background: T.amber }} /></div></div><span style={{ fontSize: "13px", fontWeight: 600, color: T.ink, whiteSpace: "nowrap" }}>{valueFmt(row.value)}</span></div>)}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return <div style={{ background: T.ink, color: T.paper, padding: "8px 12px", fontSize: "12px" }}><div style={{ opacity: 0.7, marginBottom: "2px" }}>{label}</div><div style={{ fontWeight: 600 }}>{fmtMDL(payload[0].value)}</div></div>;
}

export function SalesChart({ series, rangeDays, onRangeChange }) {
  return (
    <section style={{ marginBottom: "32px", padding: "20px", background: T.card, border: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}><h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>Динамика продаж — последние {rangeDays} дней</h3><div style={{ display: "flex", gap: "4px" }}>{[7, 30, 90].map((days) => <button key={days} onClick={() => onRangeChange(days)} style={{ fontSize: "12px", padding: "4px 10px", cursor: "pointer", color: rangeDays === days ? T.paper : T.textMuted, background: rangeDays === days ? T.ink : "transparent", border: `1px solid ${rangeDays === days ? T.ink : T.line}` }}>{days}д</button>)}</div></div>
      {series.length === 0 ? <div style={{ height: "260px", display: "grid", placeItems: "center", color: T.textMuted, fontSize: "13px" }}>Нет данных о продажах в базе</div> : <ResponsiveContainer width="100%" height={260}><AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}><defs><linearGradient id="fillVanzari" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.amber} stopOpacity={0.25} /><stop offset="100%" stopColor={T.amber} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke={T.line} vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={{ stroke: T.line }} tickLine={false} interval={rangeDays <= 7 ? 0 : rangeDays <= 30 ? 3 : 9} /><YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} width={45} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="vanzari" stroke={T.amber} strokeWidth={2} fill="url(#fillVanzari)" /></AreaChart></ResponsiveContainer>}
    </section>
  );
}

export function DrillPanel({ kpi, ordersData, routesData, agingData, onClose }) {
  if (!kpi) return null;

  const activeRoutes = Array.isArray(routesData)
    ? routesData.filter((route) => {
        const status = String(route.status ?? route.state ?? "").toLowerCase();
        return status.includes("в пути") || status.includes("active") || status.includes("in transit") || status === "on route";
      })
    : [];

  const content = kpi === "orders" ? { title: "Заказы в ожидании", cols: ["Заказ", "Клиент", "Сумма", "В ожидании"], rows: ordersData.map((order) => [order.id, order.client, fmtMDL(order.value), `${order.days} дн.`]) } : kpi === "routes" ? { title: "Активные маршруты", cols: ["Маршрут", "Направление", "Статус"], rows: activeRoutes.map((route) => [route.id, route.direction?.name || route.directionName || route.direction || ROUTE_DIRECTIONS[route.id] || "—", route.status]) } : { title: "Отчет по дебиторской задолженности", cols: ["Счет-фактура", "Клиент", "Сумма", "Просрочка"], rows: agingData.map((invoice) => [invoice.no || invoice.invoiceNo || invoice.id, invoice.client || invoice.clientName, fmtMDL(invoice.value || invoice.amount), agingBucket(invoice.agingDays || invoice.daysOverdue || 0)]) };

  return <section style={{ marginBottom: "32px", background: T.card, border: `1px solid ${T.line}` }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${T.line}` }}><h3 style={{ fontSize: "14px", fontWeight: 600, color: T.ink, margin: 0 }}>{content.title}</h3><button onClick={onClose} style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.textMuted, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}><X size={14} /> Закрыть</button></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "center" }}><thead><tr>{content.cols.map((column) => <th key={column} style={{ textAlign: "center", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: T.textMuted, borderBottom: `1px solid ${T.line}` }}>{column}</th>)}</tr></thead><tbody>{content.rows.length === 0 ? <tr><td colSpan={content.cols.length} style={{ padding: "16px 20px", color: T.textMuted, textAlign: "center" }}>Нет данных в базе</td></tr> : content.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} style={{ padding: "12px 20px", color: cellIndex === 0 ? T.ink : T.inkSoft, textAlign: "center", borderBottom: rowIndex < content.rows.length - 1 ? `1px solid ${T.line}` : "none" }}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}
