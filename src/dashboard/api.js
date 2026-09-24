const API_BASE = (import.meta.env.VITE_API_BASE || "/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      method: "GET",
      ...options,
    });
  } catch {
    throw new ApiError(0, "Бэкенд недоступен. Проверьте запуск сервера.");
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(res.status || 404, `Эндпоинт ${path} вернул non-JSON ответ`);
  }

  const data = await res.json();
  if (!res.ok) {
    const errorMessage = data && typeof data.error === "string" ? data.error : null;
    if (!errorMessage) {
      const standardMessages = {
        422: "Некорректные входные данные (422)",
        404: "Ресурс не найден (404)",
        409: "Конфликт бизнес-логики (409)",
        500: "Внутренняя ошибка сервера (500)",
      };
      throw new ApiError(
        res.status,
        standardMessages[res.status] || `Ошибка сервера (${res.status})`
      );
    }
    throw new ApiError(res.status, errorMessage);
  }

  return data;
}

export function friendlyErrorMessage(errors) {
  const messages = Array.isArray(errors) ? errors : [errors];
  const unique = [...new Set(messages.map((error) => error?.message || String(error)))];
  return unique.join(" | ");
}

export async function loadDashboardData() {
  const errors = [];
  const result = {
    summary: null,
    aging: [],
    orders: [],
    routes: [],
    products: [],
  };

  const requests = [
    ["summary", "/dashboard/summary", (data) => data],
    ["aging", "/reports/aging", (data) => data.overdueInvoices || data],
    ["orders", "/orders?status=pending", (data) => Array.isArray(data) ? data : data.orders || []],
    ["routes", "/routes", (data) => Array.isArray(data) ? data : data.routes || []],
    ["products", "/products?limit=10", (data) => Array.isArray(data) ? data : data.products || []],
  ];

  await Promise.all(
    requests.map(async ([key, path, select]) => {
      try {
        result[key] = select(await apiFetch(path));
      } catch (error) {
        errors.push(error);
      }
    })
  );

  return { result, errors };
}
