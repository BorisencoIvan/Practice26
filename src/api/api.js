import * as XLSX from 'xlsx-js-style';

const API_URL = '';

const EXCEL_HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '12161F' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    bottom: { style: 'medium', color: { rgb: 'C4832F' } },
  },
};

const EXCEL_CELL_STYLE = {
  alignment: { vertical: 'center' },
  border: {
    bottom: { style: 'thin', color: { rgb: 'D8DDD9' } },
  },
};

function formatExcelBlob(blob) {
  return blob.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true });

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet['!ref']) return;

      const range = XLSX.utils.decode_range(sheet['!ref']);
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headers = rows[0] || [];

      sheet['!freeze'] = {
        xSplit: 0,
        ySplit: 1,
        topLeftCell: 'A2',
        activePane: 'bottomRight',
        state: 'frozen',
      };
      sheet['!rows'] = [{ hpt: 28 }];
      sheet['!cols'] = headers.map((header, columnIndex) => {
        const maxLength = rows.reduce((max, row) => {
          const value = row[columnIndex] ?? '';
          return Math.max(max, String(value).length);
        }, String(header || '').length);

        return { wch: Math.min(Math.max(maxLength + 2, 12), 30) };
      });

      for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          const cell = sheet[address];
          if (!cell) continue;

          if (rowIndex === range.s.r) {
            cell.s = EXCEL_HEADER_STYLE;
            continue;
          }

          cell.s = EXCEL_CELL_STYLE;
          if (cell.t === 'n') {
            cell.z = Number.isInteger(cell.v) ? '#,##0' : '#,##0.00';
            cell.s = {
              ...EXCEL_CELL_STYLE,
              alignment: { horizontal: 'right', vertical: 'center' },
            };
          }
        }
      }
    });

    const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
    return new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });
}

function formatCsvBlob(blob) {
  return blob.arrayBuffer().then((buffer) => {
    const csvText = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
    const workbook = XLSX.read(csvText, { type: 'string', raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet, {
      FS: ';',
      RS: '\r\n',
      forceQuotes: true,
    });

    return new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    });
  });
}

export async function getInvoices() {
  const response = await fetch(
    `${API_URL}/api/v1/invoices`
  );

  if (!response.ok) {
    throw new Error(`Ошибка: ${response.status}`);
  }

  return response.json();
}

export async function getInvoice(id) {
  const response = await fetch(
    `${API_URL}/api/v1/invoices/${id}`
  );

  if (!response.ok) {
    throw new Error(`Ошибка: ${response.status}`);
  }

  return response.json();
}

export async function getInvoicePdf(id) {
  const response = await fetch(
    `${API_URL}/api/v1/invoices/${id}/pdf`
  );

  if (!response.ok) {
    throw new Error(`Ошибка: ${response.status}`);
  }

  return response.blob();
}

export async function downloadCsv() {
  const response = await fetch(
    `${API_URL}/api/v1/exports/report.csv`
  );

  if (!response.ok) {
    throw new Error(`Ошибка: ${response.status}`);
  }

  return response.blob();
}

export async function downloadXlsx() {
  const response = await fetch(
    `${API_URL}/api/v1/exports/report.xlsx`
  );

  if (!response.ok) {
    throw new Error(`Ошибка: ${response.status}`);
  }

  return response.blob();
}

export async function downloadReport({ type, fileType, from, to, columns }) {
  const params = new URLSearchParams({
    type,
    from,
    to,
    columns: columns.join(','),
  });

  const response = await fetch(
    `${API_URL}/api/v1/exports/report.${fileType}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Ошибка: ${response.status}`);
  }

  const blob = await response.blob();
  if (fileType === 'xlsx') return formatExcelBlob(blob);
  if (fileType === 'csv') return formatCsvBlob(blob);
  return blob;
}