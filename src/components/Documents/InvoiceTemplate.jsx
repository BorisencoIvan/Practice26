import { format } from 'date-fns';
import { amountToWordsMDL } from '../../utils/numberToWords';
import './InvoiceTemplate.css';

export const InvoiceTemplate = ({ invoiceData, supplierInfo }) => {
  if (!invoiceData) return <div>Загрузка данных счёта...</div>;

  const { serie, number, order_id, client, issued_at, due_at, items = [] } = invoiceData;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'dd.MM.yyyy');
  };

  const calculatedItems = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.priceWithoutVat) || 0;
    const vatRate = Number(item.vatRate) || 0;
    const sumWithoutVat = qty * price;
    const vatAmount = sumWithoutVat * (vatRate / 100);

    return { ...item, sumWithoutVat, vatAmount, totalItemSum: sumWithoutVat + vatAmount };
  });

  const subtotalWithoutVat = calculatedItems.reduce((acc, item) => acc + item.sumWithoutVat, 0);
  const totalVat = calculatedItems.reduce((acc, item) => acc + item.vatAmount, 0);
  const grandTotal = subtotalWithoutVat + totalVat;

  return (
    <div className="invoice-container">
      <div className="no-print actions-bar">
        <button type="button" onClick={() => window.print()} className="print-btn">
          🖨️ Распечатать / Сохранить в PDF
        </button>
      </div>

      <div className="invoice-paper">
        <header className="invoice-header">
          <div className="company-logo">
            <h2>{supplierInfo?.name || 'ООО "Поставщик"'}</h2>
          </div>
          <div className="invoice-title">
            <h1>СЧЁТ-ФАКТУРА</h1>
            <p className="invoice-number">№ {serie}-{number}</p>
          </div>
        </header>

        <section className="invoice-meta">
          <div><strong>Дата выписки:</strong> {formatDate(issued_at)}</div>
          <div><strong>Срок оплаты:</strong> {formatDate(due_at)}</div>
          <div><strong>Основание (Заказ №):</strong> #{order_id}</div>
        </section>

        <section className="invoice-parties">
          <div className="party supplier">
            <h3>Продавец (Поставщик):</h3>
            <p><strong>{supplierInfo?.legalName || '-'}</strong></p>
            <p>Контактное лицо: {supplierInfo?.contactPerson || '-'}</p>
            <p>Фискальный код/ИНН: {supplierInfo?.fiscalCode || '-'}</p>
            <p>Адрес: {supplierInfo?.address || '-'}</p>
            <p>Банк: {supplierInfo?.bankName || '-'}</p>
            <p>р/с: {supplierInfo?.iban || '-'}</p>
          </div>

          <div className="party client">
            <h3>Покупатель (Клиент):</h3>
            <p><strong>{client?.name || `Клиент #${invoiceData.client_id}`}</strong></p>
            <p>ID Клиента: {invoiceData.client_id}</p>
            <p>ИНН/Фискальный код: {client?.fiscalCode || '-'}</p>
            <p>Адрес доставки: {client?.deliveryAddress || client?.address || '-'}</p>
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>№</th><th>Наименование товара / услуги</th><th>Ед. изм.</th><th>Кол-во</th>
              <th>Цена без НДС</th><th>НДС %</th><th>Сумма НДС</th><th>Всего с НДС</th>
            </tr>
          </thead>
          <tbody>
            {calculatedItems.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td><td>{item.name}</td><td>{item.unit || 'шт'}</td><td>{item.qty}</td>
                <td>{(Number(item.priceWithoutVat) || 0).toFixed(2)} MDL</td>
                <td>{item.vatRate}%</td>
                <td>{(Number(item.vatAmount) || 0).toFixed(2)} MDL</td>
                <td>{(Number(item.totalItemSum) || 0).toFixed(2)} MDL</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="invoice-totals">
          <div className="totals-words">
            <p><strong>Сумма прописью:</strong></p>
            <p className="words-box">{amountToWordsMDL(grandTotal)}</p>
          </div>
          <div className="totals-numbers">
            <div className="row"><span>Сумма без НДС:</span><span>{subtotalWithoutVat.toFixed(2)} MDL</span></div>
            <div className="row"><span>Всего НДС:</span><span>{totalVat.toFixed(2)} MDL</span></div>
            <div className="row grand-total"><span>Итого к оплате:</span><span>{grandTotal.toFixed(2)} MDL</span></div>
          </div>
        </section>

        <footer className="invoice-signatures">
          <div className="sig-block"><span>Выдал (Поставщик): ___________________</span></div>
          <div className="sig-block"><span>Принял (Покупатель): ___________________</span></div>
        </footer>
      </div>
    </div>
  );
}