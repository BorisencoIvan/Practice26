export function fmtMDL(value) {
  if (value === null || value === undefined) return "0 MDL";
  const num = typeof value === "number" ? value : parseFloat(value);
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(Number.isNaN(num) ? 0 : num))} MDL`;
}

export function fmtDate(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function agingBucket(days) {
  if (days <= 30) return "0–30 дней";
  if (days <= 60) return "31–60 дней";
  return "более 60 дней";
}

export function normalizeSalesSeries(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    label: row.label || fmtDate(row.date || row.day || row.period),
    vanzari: Number(row.vanzari ?? row.sales ?? row.value ?? row.amount ?? 0),
  }));
}

export function normalizeProducts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((product) => ({
    name: product.name || product.productName || "Без названия",
    value: Number(product.value ?? product.quantity ?? product.stock ?? 0),
  }));
}

export function normalizeOrders(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((order) => {
    const createdAt = order.created_at || order.createdAt;
    const createdDate = createdAt ? new Date(createdAt) : null;
    const days = createdDate && !Number.isNaN(createdDate.getTime())
      ? Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 86400000))
      : 0;

    return {
      id: order.external_id || order.externalId || order.id,
      client: order.client?.name || order.clientName || order.client || (order.client_id ? `Клиент #${order.client_id}` : "—"),
      value: Number(order.total_amount ?? order.value ?? order.amount ?? 0),
      days: order.days ?? days,
    };
  });
}
