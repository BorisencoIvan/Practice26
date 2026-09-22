// src/components/PaymentModal.jsx
import { useState } from 'react';

export default function PaymentModal({ client, invoices, onClose, onSubmit }) {
  // 1. Состояние для общей суммы, которую принес клиент
  const [totalPayment, setTotalPayment] = useState('');
  const [apiError, setApiError] = useState(null); // Состояние для хранения ошибки от Максима
  const [isSubmitting, setIsSubmitting] = useState(false); // Чтобы блокировать кнопку при загрузке
  
  // 2. Состояние для хранения того, сколько денег мы распределили на каждый счет
  // Формат: { invoiceId1: сумма, invoiceId2: сумма }
  const [allocations, setAllocations] = useState({});

  // 3. Высчитываем, сколько денег "осталось" распределить
  const allocatedSum = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const remainingToAllocate = (Number(totalPayment) || 0) - allocatedSum;

  // 4. Функция для "Автораспределения" (Кнопка, чтобы не вписывать руками)
  // Она берет общую сумму и раскидывает её по счетам от самых старых к новым
  const handleAutoAllocate = () => {
    let currentRemaining = Number(totalPayment) || 0;
    const newAllocations = {};

    // Сортируем счета по дате (сначала старые)
    const sortedInvoices = [...invoices].sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    sortedInvoices.forEach(inv => {
      const debt = inv.total - inv.paid; // Сколько должны по этому счету
      if (currentRemaining > 0 && debt > 0) {
        // Берем минимум: либо весь долг по счету, либо то, что осталось от общей суммы
        const amountToPay = Math.min(debt, currentRemaining);
        newAllocations[inv.id] = amountToPay;
        currentRemaining -= amountToPay;
      } else {
        newAllocations[inv.id] = 0;
      }
    });

    setAllocations(newAllocations);
  };

  // 5. Функция ручного ввода суммы в конкретный счет
  const handleAllocationChange = (invoiceId, value, maxDebt) => {
    let numValue = Number(value);
    
    // Нельзя заплатить отрицательную сумму
    if (numValue < 0) numValue = 0;
    
    // Нельзя заплатить по счету больше, чем сам долг
    if (numValue > maxDebt) numValue = maxDebt;

    setAllocations({
      ...allocations,
      [invoiceId]: numValue === 0 ? '' : numValue // Если 0, оставляем пустое поле для красоты
    });
  };

  // 6. Отправка данных (сохранение оплаты)
  const handleSave = async () => {
    if (remainingToAllocate < 0) {
      setApiError("Вы распределили больше денег, чем принес клиент!");
      return;
    }
    
    setApiError(null);
    setIsSubmitting(true);

    const paymentData = {
      clientId: client.id,
      totalAmount: totalPayment,
      allocations: Object.entries(allocations)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([invId, amount]) => ({ invoiceId: Number(invId), amount: Number(amount) }))
    };

    try {
      // ВРЕМЕННАЯ ЗАГЛУШКА: Имитируем запрос к серверу (удали setTimeout потом)
      // Когда Максим даст URL, раскомментируй код ниже (fetch...)
      
      /*
      const response = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Перехватываем ошибку 409 или любую другую, как просил Максим в файле handoff
        throw new Error(errorData.error || 'Произошла неизвестная ошибка сервера');
      }
      */

      // Имитация успешного ответа
      setTimeout(() => {
        setIsSubmitting(false);
        onSubmit(paymentData); 
      }, 1000);

    } catch (err) {
      setIsSubmitting(false);
      setApiError(err.message); // Выведет текст ошибки на экран
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Регистрация оплаты: {client.name}</h2>
        
        {/* Блок ввода общей суммы */}
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
            <span style={{ color: remainingToAllocate < 0 ? 'red' : 'green', fontWeight: 'bold' }}>
              Остаток для распределения: {remainingToAllocate} MDL
            </span>
            <button 
              onClick={handleAutoAllocate}
              disabled={!totalPayment || totalPayment <= 0}
              style={{ padding: '5px 10px', cursor: 'pointer' }}
            >
              Авто-распределение (старые счета)
            </button>
          </div>
        </div>

        {/* Список счетов для распределения */}
        <h4>Распределение по счетам:</h4>
        {invoices.map(inv => {
          const debt = inv.total - inv.paid;
          const currentAlloc = allocations[inv.id] || '';
          
          return (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #ccc' }}>
              <div>
                <strong>{inv.serie}-{inv.number}</strong> (Долг: {debt} MDL)
                <br/>
                <small style={{ color: '#666' }}>Срок: {new Date(inv.due_at).toLocaleDateString()}</small>
              </div>
              <div>
                <input 
                  type="number" 
                  value={currentAlloc}
                  onChange={(e) => handleAllocationChange(inv.id, e.target.value, debt)}
                  placeholder="0"
                  style={{ padding: '5px', width: '100px', textAlign: 'right' }}
                /> MDL
              </div>
            </div>
          );
        })}

        {/* Вывод ошибки от сервера */}
        {apiError && (
          <div style={{ color: 'red', marginTop: '15px', fontWeight: 'bold' }}>
            Ошибка: {apiError}
          </div>
        )}

        {/* Кнопки управления */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} disabled={isSubmitting} style={{ padding: '10px 20px', cursor: 'pointer' }}>Отмена</button>
          <button 
            onClick={handleSave} 
            disabled={!totalPayment || totalPayment <= 0 || remainingToAllocate < 0 || isSubmitting}
            style={{ padding: '10px 20px', backgroundColor: isSubmitting ? '#999' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить оплату'}
          </button>
        </div>
      </div>
    </div>
  );
}