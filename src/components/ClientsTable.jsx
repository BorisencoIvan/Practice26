// src/components/ClientsTable.jsx
import { useState, useEffect } from 'react';

export default function ClientsTable({ onSelectClient }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Загрузка данных с сервера Максима
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/v1/clients');
        if (!response.ok) throw new Error('Ошибка загрузки клиентов');
        const data = await response.json();
        // Предполагаем, что сервер возвращает { clients: [...] } или просто массив
        setClients(data.clients || data); 
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const sortedClients = [...clients].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setClients(sortedClients);
    setSortConfig({ key, direction });
  };

  if (loading) return <div className="page-shell">Загрузка клиентов...</div>;
  if (error) return <div className="page-shell form-error">Ошибка: {error}</div>;

  return (
    <div className="page-shell">
      <header className="page-header"><h1>Клиенты</h1><span className="page-date">Баланс и задолженность</span></header>
      <div className="surface table-wrap"><table className="data-table">
        <thead>
            <tr><th className="sortable" onClick={() => handleSort('name')}>
              Клиент {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th className="sortable" onClick={() => handleSort('balance')}>
              Баланс / Долг {sortConfig.key === 'balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th className="sortable" onClick={() => handleSort('maxDebtAge')}>
              Возраст долга {sortConfig.key === 'maxDebtAge' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const isCriticalDebt = client.maxDebtAge > 60;
            return (
              <tr key={client.id} className={isCriticalDebt ? 'is-critical' : ''}>
                <td>
                  {client.name} 
                  {isCriticalDebt && <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>⚠️</span>}
                </td>
                <td>{client.balance} MDL</td>
                <td>{client.maxDebtAge} дней</td>
                <td><button className="button-secondary" onClick={() => onSelectClient(client)}>
                    Детали
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </div>
  );
}