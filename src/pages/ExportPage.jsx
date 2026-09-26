import { useState } from 'react';
import { downloadReport } from "../api/api";

const COLUMNS_BY_TYPE = {
  sales: [
    { value: 'id', label: 'ID продажи' },
    { value: 'client', label: 'Клиент' },
    { value: 'date', label: 'Дата продажи' },
    { value: 'amount', label: 'Сумма продажи' },
    { value: 'status', label: 'Статус оплаты' },
    { value: 'manager', label: 'Менеджер' },
    { value: 'vat', label: 'НДС' },
  ],
  debts: [
    { value: 'id', label: 'ID клиента / счёта' },
    { value: 'client', label: 'Клиент' },
    { value: 'total_debt', label: 'Сумма долга' },
    { value: 'due_date', label: 'Срок оплаты' },
    { value: 'days_overdue', label: 'Дней просрочки' },
    { value: 'aging_bucket', label: 'Интервал просрочки' },
    { value: 'last_payment_date', label: 'Дата последней оплаты' },
    { value: 'manager', label: 'Менеджер' },
    { value: 'status', label: 'Статус задолженности' },
  ],
};

function getDefaultColumns(type) {
  return COLUMNS_BY_TYPE[type].slice(0, 4).map((column) => column.value);
}

export default function ExportPage() {
  const [exportType, setExportType] = useState('sales');
  const [fileType, setFileType] = useState('csv');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [columns, setColumns] = useState(() => getDefaultColumns('sales'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableColumns = COLUMNS_BY_TYPE[exportType];

  function handleTypeChange(type) {
    setExportType(type);
    setColumns(getDefaultColumns(type));
  }

  function toggleColumn(column) {
    if (columns.includes(column)) {
      setColumns(columns.filter(c => c !== column));
    } else {
      setColumns([...columns, column]);
    }
  }

  async function handleExport() {
    try {
      setLoading(true);
      setError('');

      // 1. Вызываем функцию из api.js с данными из формы
      const blob = await downloadReport({
        type: exportType,
        fileType: fileType,
        from: dateFrom,
        to: dateTo,
        columns: columns
      });

      // 2. Скачиваем полученный файл
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${exportType}.${fileType}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ошибка при экспорте файла');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="page-header"><h1>Экспорт данных</h1><span className="page-date">Формирование отчёта</span></header>

      <section className="surface form-panel">
        <div className="form-grid">
        <label className="form-field">
          <span>Тип данных</span>
          <select
            value={exportType}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="sales">Продажи</option>
            <option value="debts">Задолженности</option>
          </select>
        </label>

        <label className="form-field"><span>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="form-field"><span>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        <label className="form-field"><span>Формат файла</span>
          <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
          </select>
        </label>
        </div>

        <div className="columns-panel"><h3>Колонки для экспорта</h3>

        <div
          style={{
            display: 'grid',
            gap: '8px',
            width: 'fit-content',
            margin: '0 auto',
            textAlign: 'left',
          }}
        >
          {availableColumns.map((column) => (
            <label
              key={column.value}
              className="checkbox-row"
            >
              <input
                type="checkbox"
                checked={columns.includes(column.value)}
                onChange={() => toggleColumn(column.value)}
              />
              {column.label}
            </label>
          ))}
        </div>
        </div>

      {error && (
        <p className="form-error">
          Ошибка: {error}
        </p>
      )}

      <button
        className="button-primary export-button"
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Подготовка файла...' : 'Скачать файл'}
      </button></section>
    </div>
  );
}