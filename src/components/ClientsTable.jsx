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

  if (loading) return <div style={{ padding: '20px' }}>Загрузка клиентов...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Ошибка: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Таблица клиентов (Tabel de clienți)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '10px', cursor: 'pointer' }} onClick={() => handleSort('name')}>
              Клиент {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ padding: '10px', cursor: 'pointer' }} onClick={() => handleSort('balance')}>
              Баланс / Долг {sortConfig.key === 'balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ padding: '10px', cursor: 'pointer' }} onClick={() => handleSort('maxDebtAge')}>
              Возраст долга {sortConfig.key === 'maxDebtAge' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ padding: '10px' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const isCriticalDebt = client.maxDebtAge > 60;
            return (
              <tr key={client.id} style={{ 
                borderBottom: '1px solid #ddd',
                backgroundColor: isCriticalDebt ? '#ffebeb' : 'transparent',
                color: isCriticalDebt ? '#d32f2f' : 'inherit'
              }}>
                <td style={{ padding: '10px' }}>
                  {client.name} 
                  {isCriticalDebt && <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>⚠️</span>}
                </td>
                <td style={{ padding: '10px' }}>{client.balance} MDL</td>
                <td style={{ padding: '10px' }}>{client.maxDebtAge} дней</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => onSelectClient(client)} style={{ padding: '5px 10px', cursor: 'pointer' }}>
                    Детали (Detaliu)
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}