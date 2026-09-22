// src/components/ClientDetails.jsx
import { useState } from 'react';
import { clientInvoices } from '../mockData';
import PaymentModal from './PaymentModal'; // <--- Импортируем модальное окно

export default function ClientDetails({ client, onBack }) {
  const invoices = clientInvoices.filter(inv => inv.clientId === client.id);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Функция, которая сработает, когда кассир нажмет "Сохранить оплату"
  const handlePaymentSubmit = (paymentData) => {
    console.log("Данные для отправки Максиму (Backend):", paymentData);
    
    // Имитируем успешное сохранение
    alert(`Успех! Оплата на сумму ${paymentData.totalAmount} MDL распределена.\nПосмотри консоль (F12) для деталей.`);
    
    // Закрываем окно
    setIsPaymentModalOpen(false);
  };

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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
        <p style={{ color: '#666' }}>У этого клиента нет неоплаченных счетов.</p>
      )}

      {/* Вызываем компонент распределения оплаты, передаем ему данные */}
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