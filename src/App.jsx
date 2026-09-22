import MetricsGrid from './components/MetricsGrid';
import SalesChart from './components/SalesChart';
import TopClients from './components/TopClients';
import TopProducts from './components/TopProducts';
import './App.css';

export default function App() {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-header">Дашборд Поставщика</h1>
      
      <MetricsGrid />
      <SalesChart />
      
      <div className="top-lists-grid">
        <TopClients />
        <TopProducts />
      </div>
    </div>
  );
}