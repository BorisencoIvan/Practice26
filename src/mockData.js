// src/mockData.js Тестовые данные
export const clientsData = [
  { id: 1, name: "SRL Alpha", balance: 5000, maxDebtAge: 15 },
  { id: 2, name: "SRL Beta", balance: 12000, maxDebtAge: 65 }, // Долг старше 60 дней
  { id: 3, name: "SRL Gamma", balance: 0, maxDebtAge: 0 },
  { id: 4, name: "SRL Delta", balance: 3500, maxDebtAge: 45 },
];

export const clientInvoices = [
  { id: 101, clientId: 2, serie: "INV", number: 1, total: 5000, paid: 0, due_at: "2026-07-01T00:00:00.000Z" },
  { id: 102, clientId: 2, serie: "INV", number: 2, total: 7000, paid: 0, due_at: "2026-08-15T00:00:00.000Z" }
];

// Добавь это в конец файла src/mockData.js
export const paymentHistoryData = [
  { id: 1, clientId: 2, amount: 2000, date: "2026-08-01T10:00:00.000Z", receiptNumber: "REC-001" },
  { id: 2, clientId: 2, amount: 1500, date: "2026-08-15T14:30:00.000Z", receiptNumber: "REC-002" },
  { id: 3, clientId: 4, amount: 3500, date: "2026-09-01T09:15:00.000Z", receiptNumber: "REC-003" }
];