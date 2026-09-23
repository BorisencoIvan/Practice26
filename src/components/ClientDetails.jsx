// src/components/ClientDetails.jsx
import { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal';

export default function ClientDetails({ client, onBack }) {
  const [invoices, setInvoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        const response = await fetch(`/api/v1/clients/${client.id}`);
        if (!response.ok) throw new Error('Ошибка загрузки данных клиента');
        const data = await response.json();
        
        // Предполагаем, что сервер Максима возвращает { invoices: [], history: [] }
        setInvoices(data.invoices || []);
        setHistory(data.history || []);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchClientDetails();
  }, [client.id]);

  const handlePaymentSubmit = async () => {
    setIsPaymentModalOpen(false);
    // При успехе перезагружаем данные, чтобы обновить балансы на экране
    setLoading(true);
    try {
        const response = await fetch(`/api/v1/clients/${client.id}`);
        const data = await response.json();
        setInvoices(data.invoices || []);
        setHistory(data.history || []);
        setLoading(false);
    } catch(err) {
        console.error("Ошибка обновления после оплаты");
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Загрузка профиля...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Ошибка: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer' }}>
        ← Вернуться к списку клиентов
      </button>

      <h2>Профиль клиента: {client.name}</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div>
          <p><strong>Общий долг:</strong> {client.balance} MDL</p>
          <p><strong>Максимальная просрочка:</strong> {client.maxDebtAge} дней</p>
        </div>
        <div>
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            style={{ backgroundColor: '#4CAF50', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}
          >
            💰 Внести оплату (Înregistrare încasare)
          </button>
        </div>
      </div>

      <h3>Неоплаченные счета (Facturi neachitate)</h3>
      {invoices.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '40px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px' }}>Документ</th>
              <th style={{ padding: '10px' }}>Сумма счета</th>
              <th style={{ padding: '10px' }}>Оплачено ранее</th>
              <th style={{ padding: '10px' }}>Остаток к оплате</th>
              <th style={{ padding: '10px' }}>Срок (Due Date)</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{inv.serie}-{inv.number}</td>
                <td style={{ padding: '10px' }}>{inv.total} MDL</td>
                <td style={{ padding: '10px' }}>{inv.paid} MDL</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{inv.total - inv.paid} MDL</td>
                <td style={{ padding: '10px' }}>{new Date(inv.due_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#666', marginBottom: '40px' }}>У этого клиента нет неоплаченных счетов.</p>
      )}

      <h3>История платежей (Istoric de plăți)</h3>
      {history.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px' }}>Номер квитанции</th>
              <th style={{ padding: '10px' }}>Сумма оплаты</th>
              <th style={{ padding: '10px' }}>Дата и время</th>
            </tr>
          </thead>
          <tbody>
            {history.map((pay) => (
              <tr key={pay.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{pay.receiptNumber}</td>
                <td style={{ padding: '10px', color: 'green', fontWeight: 'bold' }}>+{pay.amount} MDL</td>
                <td style={{ padding: '10px' }}>{new Date(pay.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#666' }}>История платежей пуста.</p>
      )}

      {isPaymentModalOpen && (
        <PaymentModal 
          client={client}
          invoices={invoices}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </div>
  );
}