import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = Array.from({ length: 30 }, (_, i) => ({
  day: `День ${i + 1}`,
  продажи: Math.floor(Math.random() * 5000) + 1000,
}));

export default function SalesChart() {
  return (
    <div className="chart-section">
      <h3>Динамика продаж (последние 30 дней)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" hide />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="продажи" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}