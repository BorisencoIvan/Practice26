// src/App.jsx
import { useState } from 'react';
import ClientsTable from './components/ClientsTable';

function App() {
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <div>
      <header style={{ backgroundColor: '#333', color: 'white', padding: '10px 20px' }}>
        <h1>W4 Back-Office: Балансы и Поступления</h1>
      </header>

      <main>
        {/* Если клиент не выбран, показываем таблицу. Если выбран - покажем детали (сделаем в следующем этапе) */}
        {!selectedClient ? (
          <ClientsTable onSelectClient={(client) => setSelectedClient(client)} />
        ) : (
          <div style={{ padding: '20px' }}>
            <button onClick={() => setSelectedClient(null)}>← Вернуться к списку</button>
            <h2>Детали клиента: {selectedClient.name}</h2>
            <p>Здесь будет список счетов и интерфейс распределения оплаты.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;