import { useState } from 'react';
import { downloadCsv, downloadXlsx } from '../api/api';

export default function ExportPage() {
  const [type, setType] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    try {
      setLoading(true);
      setError('');

      const blob =
        type === 'csv'
          ? await downloadCsv()
          : await downloadXlsx();

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      link.download =
        type === 'csv'
          ? 'report.csv'
          : 'report.xlsx';

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Экспорт данных</h2>

      <label>
        Формат файла:
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
        </select>
      </label>

      {error && (
        <p style={{ color: 'red' }}>
          Ошибка: {error}
        </p>
      )}

      <button
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Загрузка...' : 'Скачать экспорт'}
      </button>
    </div>
  );
}