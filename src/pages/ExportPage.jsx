import { useState } from 'react';

export default function ExportPage() {
  const [type, setType] = useState('csv');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const availableColumns = [
    'client',
    'date',
    'total',
    'status'
  ];

  const [columns, setColumns] = useState([
    'client',
    'date'
  ]);

  const handleExport = () => {
    alert(`
Формат: ${type}
Период: ${fromDate} - ${toDate}
Колонки: ${columns.join(', ')}
    `);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Экспорт данных</h2>

      <div style={{ marginBottom: '15px' }}>
        <label>Формат файла: </label>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Дата от: </label>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Дата до: </label>

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      <h3>Выберите колонки:</h3>

      {availableColumns.map((col) => (
        <label
          key={col}
          style={{
            display: 'block',
            marginBottom: '5px'
          }}
        >
          <input
            type="checkbox"
            checked={columns.includes(col)}
            onChange={() => {
              if (columns.includes(col)) {
                setColumns(
                  columns.filter(c => c !== col)
                );
              } else {
                setColumns([
                  ...columns,
                  col
                ]);
              }
            }}
          />

          {' '}{col}
        </label>
      ))}

      <button
        onClick={handleExport}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          cursor: 'pointer'
        }}
      >
        Скачать экспорт
      </button>
    </div>
  );
}
