// src/App.jsx
import { useState } from 'react';
import ClientsTable from './components/ClientsTable';
import ClientDetails from './components/ClientDetails'; // Импортируем новый компонент

function App() {
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <div>
      <header style={{ backgroundColor: '#333', color: 'white', padding: '10px 20px' }}>
        <h1>W4 Back-Office: Балансы и Поступления</h1>
      </header>

      <main>
        {!selectedClient ? (
          <ClientsTable onSelectClient={(client) => setSelectedClient(client)} />
        ) : (
          /* Используем новый компонент ClientDetails */
          <ClientDetails 
            client={selectedClient} 
            onBack={() => setSelectedClient(null)} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
