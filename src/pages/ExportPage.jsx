import { useState } from 'react';

export default function ExportPage() {
  const [exportType, setExportType] = useState('sales');
  const [fileType, setFileType] = useState('csv');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [columns, setColumns] = useState([
    'id',
    'client',
    'date',
    'amount'
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableColumns = [
    { value: 'id', label: 'ID' },
    { value: 'client', label: 'Клиент' },
    { value: 'date', label: 'Дата' },
    { value: 'amount', label: 'Сумма' },
    { value: 'status', label: 'Статус' },
    { value: 'manager', label: 'Менеджер' },
    { value: 'vat', label: 'НДС' }
  ];

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

      const params = new URLSearchParams({
        type: exportType,
        from: dateFrom,
        to: dateTo,
        columns: columns.join(',')
      });

      const response = await fetch(
        fileType === 'csv'
          ? `/api/v1/exports/report.csv?${params}`
          : `/api/v1/exports/report.xlsx?${params}`
      );

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status}`);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      link.download =
        fileType === 'csv'
          ? 'report.csv'
          : 'report.xlsx';

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Экспорт данных</h2>

      <div style={{ marginBottom: '15px' }}>
        <label>
          Тип данных:
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
          >
            <option value="sales">Продажи</option>
            <option value="debts">Задолженности</option>
            <option value="documents">Документы</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>
          Дата от:
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label style={{ marginLeft: '20px' }}>
          Дата до:
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>Колонки для экспорта</h4>

        {availableColumns.map((column) => (
          <div key={column.value}>
            <label>
              <input
                type="checkbox"
                checked={columns.includes(column.value)}
                onChange={() => toggleColumn(column.value)}
              />
              {' '}
              {column.label}
            </label>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>
          Формат файла:
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
          </select>
        </label>
      </div>

      {error && (
        <p style={{ color: 'red' }}>
          Ошибка: {error}
        </p>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Подготовка файла...' : 'Скачать файл'}
      </button>
    </div>
  );
}