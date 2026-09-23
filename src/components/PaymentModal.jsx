// src/components/PaymentModal.jsx
import { useState } from 'react';

export default function PaymentModal({ client, invoices, onClose, onSubmit }) {
  const [totalPayment, setTotalPayment] = useState('');
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocations, setAllocations] = useState({});

  const allocatedSum = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const remainingToAllocate = (Number(totalPayment) || 0) - allocatedSum;

  const getInvoiceId = (inv) => inv.invoiceId ?? inv.id;

  const handleAutoAllocate = () => {
    let currentRemaining = Number(totalPayment) || 0;
    const newAllocations = {};
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    sortedInvoices.forEach(inv => {
      const invId = getInvoiceId(inv);
      const debt = inv.total - inv.paid;
      if (currentRemaining > 0 && debt > 0) {
        const amountToPay = Math.min(debt, currentRemaining);
        newAllocations[invId] = amountToPay;
        currentRemaining -= amountToPay;
      } else {
        newAllocations[invId] = 0;
      }
    });

    setAllocations(newAllocations);
  };

  const handleAllocationChange = (invId, value, maxDebt) => {
    let numValue = Number(value);
    if (numValue < 0) numValue = 0;
    if (numValue > maxDebt) numValue = maxDebt;

    setAllocations({
      ...allocations,
      [invId]: numValue === 0 ? '' : numValue
    });
  };

  const handleSave = async () => {
    if (remainingToAllocate !== 0) {
      setApiError("Распределите всю сумму по счетам перед сохранением!");
      return;
    }
    
    setApiError(null);
    setIsSubmitting(true);

    const paymentsToSend = Object.entries(allocations)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([invId, amount]) => ({
        clientId: Number(client.id || client.clientId), // Добавлена эта строка
        invoiceId: Number(invId),
        amount: Number(amount),
        paymentMethod: "bank", 
        reference: "Оплата через Back-Office" 
      }));
      
    try {
      // 2. Отправляем отдельный POST-запрос для КАЖДОГО счета параллельно
      await Promise.all(
        paymentsToSend.map(payment =>
          fetch('/api/v1/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment) // Отправляем ровно ту структуру, которую просит Максим
          }).then(async (res) => {
            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || `Ошибка сервера при оплате счета ID: ${payment.invoiceId}`);
            }
          })
        )
      );

      // Если все запросы прошли успешно:
      setIsSubmitting(false);
      onSubmit(); 
      
    } catch (err) {
      setIsSubmitting(false);
      setApiError(err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Регистрация оплаты: {client.name}</h2>
        
        <div style={{ backgroundColor: '#eef', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>
            Общая сумма к распределению (MDL):
          </label>
          <input 
            type="number" 
            value={totalPayment} 
            onChange={(e) => setTotalPayment(e.target.value)}
            placeholder="Например, 6000"
            style={{ padding: '8px', width: '200px', fontSize: '16px' }}
          />
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: remainingToAllocate === 0 && totalPayment > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
              Остаток для распределения: {remainingToAllocate} MDL
            </span>
            <button 
              onClick={handleAutoAllocate}
              disabled={!totalPayment || totalPayment <= 0}
              style={{ padding: '5px 10px', cursor: 'pointer' }}
            >
              Авто-распределение
            </button>
          </div>
        </div>

        <h4>Распределение по счетам:</h4>
        {invoices.map(inv => {
          const invId = getInvoiceId(inv);
          const debt = inv.total - inv.paid;
          const currentAlloc = allocations[invId] || '';
          
          return (
            <div key={invId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #ccc' }}>
              <div>
                <strong>{inv.serie}-{inv.number}</strong> (Долг: {debt} MDL)
                <br/>
                <small style={{ color: '#666' }}>Срок: {new Date(inv.due_at).toLocaleDateString()}</small>
              </div>
              <div>
                <input 
                  type="number" 
                  value={currentAlloc}
                  onChange={(e) => handleAllocationChange(invId, e.target.value, debt)}
                  placeholder="0"
                  style={{ padding: '5px', width: '100px', textAlign: 'right' }}
                /> MDL
              </div>
            </div>
          );
        })}

        {apiError && (
          <div style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>
            Ошибка: {apiError}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} disabled={isSubmitting} style={{ padding: '10px 20px', cursor: 'pointer' }}>Отмена</button>
          <button 
            onClick={handleSave} 
            disabled={!totalPayment || totalPayment <= 0 || remainingToAllocate !== 0 || isSubmitting}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: (!totalPayment || totalPayment <= 0 || remainingToAllocate !== 0 || isSubmitting) ? '#999' : '#4CAF50', 
              color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' 
            }}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить оплату'}
          </button>
        </div>
      </div>
    </div>
  );
}