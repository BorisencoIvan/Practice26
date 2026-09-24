import { useState } from 'react';
import ClientsTable from './ClientsTable';
import ClientDetails from './ClientDetails';

export default function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <div>
      {!selectedClient ? (
        <ClientsTable onSelectClient={(client) => setSelectedClient(client)} />
      ) : (
        <ClientDetails 
          client={selectedClient} 
          onBack={() => setSelectedClient(null)} 
        />
      )}
    </div>
  );
}