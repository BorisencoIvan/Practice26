// src/components/ClientDetails.jsx
import { useState } from 'react';
import { clientInvoices } from '../mockData';

export default function ClientDetails({ client, onBack }) {
  // Фильтруем счета (invoice) только для текущего клиента
  const invoices = clientInvoices.filter(inv => inv.clientId === client.id);

  // Состояние для открытия/закрытия окна оплаты
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <button 
        onClick={onBack} 
        style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer' }}
      >
        ← Вернуться к списку клиентов
      </button>

      <h2>Профиль клиента: {client.name}</h2>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        backgroundColor: '#f9f9f9', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div>
          <p><strong>Общий долг:</strong> {client.balance} MDL</p>
          <p><strong>Максимальная просрочка:</strong> {client.maxDebtAge} дней</p>
        </div>
        <div>
          {/* Кнопка для открытия интерфейса распределения оплаты */}
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            style={{ 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              padding: '12px 24px', 
              border: 'none', 
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
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
                {/* Форматируем дату, чтобы она выглядела красиво, а не как ISO 8601 */}
                <td style={{ padding: '10px' }}>{new Date(inv.due_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#666' }}>У этого клиента нет неоплаченных счетов.</p>
      )}

      {/* Здесь будет интерфейс оплаты (Модальное окно), который мы сделаем на следующем этапе */}
      {isPaymentModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px' }}>
            <h3>Распределение оплаты</h3>
            <p>Скоро здесь будет сложный интерфейс аллокации...</p>
            <button onClick={() => setIsPaymentModalOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}