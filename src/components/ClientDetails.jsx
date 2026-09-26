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
        
        console.log("Данные клиента от сервера:", data);
        // Предполагаем, что сервер Максима возвращает { invoices: [], history: [] }
        setInvoices(data.invoices || []);
        setHistory(data.paymentHistory || []);
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
        console.log("Данные клиента от сервера:", data);
        setInvoices(data.invoices || []);
        setHistory(data.paymentHistory || []);
        setLoading(false);
    } catch {
        console.error("Ошибка обновления после оплаты");
    }
  };

  if (loading) return <div className="page-shell">Загрузка профиля...</div>;
  if (error) return <div className="page-shell form-error">Ошибка: {error}</div>;

  return (
    <div className="page-shell">
      <button onClick={onBack} className="button-secondary back-button">
        ← Вернуться к списку клиентов
      </button>

      <header className="page-header"><h1>Профиль клиента: {client.name}</h1><span className="page-date">Баланс клиента</span></header>
      
      <div className="surface client-summary">
        <div>
          <p><strong>Общий долг:</strong> {client.balance} MDL</p>
          <p><strong>Максимальная просрочка:</strong> {client.maxDebtAge} дней</p>
        </div>
        <div>
          <button className="button-primary"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            Внести оплату
          </button>
        </div>
      </div>

      <h3>Неоплаченные счета</h3>
      {invoices.length > 0 ? (
        <div className="surface table-wrap"><table className="data-table">
          <thead>
            <tr><th>Документ</th><th>Сумма счета</th><th>Оплачено ранее</th><th>Остаток к оплате</th><th>Срок оплаты</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}><td>{inv.serie}-{inv.number}</td><td>{inv.total} MDL</td><td>{inv.paid} MDL</td><td><strong>{inv.total - inv.paid} MDL</strong></td><td>{new Date(inv.due_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : (
        <p style={{ color: '#666', marginBottom: '40px' }}>У этого клиента нет неоплаченных счетов.</p>
      )}

      <h3>История платежей</h3>
      {history.length > 0 ? (
        <div className="surface table-wrap"><table className="data-table">
          <thead>
            <tr><th>Номер квитанции</th><th>Сумма оплаты</th><th>Дата и время</th>
            </tr>
          </thead>
          <tbody>
            {history.map((pay) => (
              <tr key={pay.id}><td>{pay.receiptNumber}</td><td className="positive-value">+{pay.amount} MDL</td><td>{new Date(pay.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
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