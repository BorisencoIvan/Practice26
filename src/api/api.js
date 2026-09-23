const API_URL = 'http://localhost:3000';

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