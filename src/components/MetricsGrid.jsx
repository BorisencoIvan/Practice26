export default function MetricsGrid() {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <h3>Продажи (Сегодня / Месяц)</h3>
        <div className="metric-value">25,000 MDL / 450,000 MDL</div>
        <div className="trend-positive">↑ +12% по сравнению с прошлым месяцем</div>
      </div>

      <div className="metric-card">
        <h3>Заказы в ожидании</h3>
        <div className="metric-value">34</div>
      </div>

      <div className="metric-card">
        <h3>Активные маршруты</h3>
        <div className="metric-value">12</div>
      </div>

      <div className="metric-card">
        <h3>Общая сумма к получению</h3>
        <div className="metric-value">120,500 MDL</div>
      </div>
    </div>
  );
}