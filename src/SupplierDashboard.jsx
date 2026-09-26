import { useEffect, useMemo, useState } from "react";
import { Route as RouteIcon, Wallet, Clock, TrendingUp } from "lucide-react";
import { EMPTY_SUMMARY, T } from "./dashboard/constants";
import { friendlyErrorMessage, loadDashboardData } from "./dashboard/api";
import { fmtMDL, normalizeOrders, normalizeProducts, normalizeSalesSeries } from "./dashboard/utils";
import {
  DrillPanel,
  ErrorBanner,
  KpiCard,
  RankTable,
  SalesChart,
} from "./components/DashboardWidgets";

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
    const { result, errors } = await loadDashboardData();

    if (result.summary) {
      setSummaryData({
        ...EMPTY_SUMMARY,
        ...(result.summary.summary || {}),
        salesSeries: result.summary.salesSeries || [],
        topClients: result.summary.topClients || [],
      });
    } else {
      setSummaryData(EMPTY_SUMMARY);
    }

    setAgingData(result.aging);
    setOrdersData(normalizeOrders(result.orders));
    setRoutesData(result.routes);
    setProductsData(normalizeProducts(result.products));
    if (errors.length > 0) setApiError(friendlyErrorMessage(errors));
    setLoading(false);
  };

  useEffect(() => {
    const timerId = setTimeout(loadData, 0);
    return () => clearTimeout(timerId);
  }, []);

  const series = useMemo(
    () => normalizeSalesSeries(summaryData.salesSeries).slice(-rangeDays),
    [summaryData.salesSeries, rangeDays]
  );
  const topProducts = useMemo(
    () => [...productsData].sort((a, b) => b.value - a.value).slice(0, 10),
    [productsData]
  );
  const averagePendingOrdersPerDay = useMemo(() => {
    if (!ordersData.length) return "—";

    const maxAge = ordersData.reduce(
      (max, order) => Math.max(max, Number(order.days) || 0),
      0
    );

    const daysWindow = Math.max(1, maxAge + 1);
    return (ordersData.length / daysWindow).toFixed(1);
  }, [ordersData]);
  const totalRoutesCount = routesData.length;
  const activeRoutesCount = useMemo(
    () => routesData.filter((route) => {
      const status = String(route.status ?? route.state ?? "").toLowerCase();
      return status.includes("в пути") || status.includes("active") || status.includes("in transit") || status === "on route";
    }).length,
    [routesData]
  );
  const toggleKpi = (key) => setSelectedKpi((current) => (current === key ? null : key));

  return (
    <div className="dashboard-page">
      <main>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: T.ink, margin: 0 }}>Панель управления поставщика</h1>
          <div style={{ fontSize: "12px", padding: "6px 12px", border: `1px solid ${T.line}`, color: T.textMuted }}>
            {new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </header>

        <ErrorBanner message={apiError} onRetry={loadData} loading={loading} />

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <KpiCard accent={T.amber} icon={<TrendingUp size={16} />} title="ПРОДАЖИ" primary={fmtMDL(summaryData.todaySales)} secondary={{ label: "за месяц", value: fmtMDL(summaryData.monthSales) }} delta={summaryData.salesDelta} deltaLabel="к прошлому месяцу" />
          <KpiCard accent={T.inkSoft} icon={<Clock size={16} />} title="ЗАКАЗЫ В ОЖИДАНИИ" primary={summaryData.pendingOrders} secondary={{ label: "среднее / день", value: averagePendingOrdersPerDay }} onClick={() => toggleKpi("orders")} active={selectedKpi === "orders"} />
          <KpiCard accent={T.teal} icon={<RouteIcon size={16} />} title="ВСЕГО МАРШРУТОВ" primary={totalRoutesCount} secondary={{ label: "Маршруты на линии", value: activeRoutesCount }} onClick={() => toggleKpi("routes")} active={selectedKpi === "routes"} />
          <KpiCard accent={T.rust} icon={<Wallet size={16} />} title="ОБЩАЯ СУММА К ПОЛУЧЕНИЮ" primary={fmtMDL(summaryData.totalReceivable)} secondary={{ label: "просроченные счета", value: agingData.length }} onClick={() => toggleKpi("receivable")} active={selectedKpi === "receivable"} />
        </section>

        <DrillPanel kpi={selectedKpi} ordersData={ordersData} routesData={routesData} agingData={agingData} onClose={() => setSelectedKpi(null)} />
        <SalesChart series={series} rangeDays={rangeDays} onRangeChange={setRangeDays} />

        <section style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          <RankTable title="Топ-10 клиентов" rows={summaryData.topClients} valueFmt={fmtMDL} />
          <RankTable title="Топ-10 товаров" rows={topProducts} valueFmt={(value) => `${value} шт.`} />
        </section>
      </main>
    </div>
  );
}
