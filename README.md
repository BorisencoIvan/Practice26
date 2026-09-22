# invoicing-backend

Initial backend project scaffold for:
- invoice per delivered order
- borderou de livrare per route
- safe sequential numbering (series + number)
- client balance and aging reports
- CSV/XLSX export
- PDF generation

## Module boundaries
- `documents`: invoice and borderou lifecycle
- `numbering`: atomic numbering service
- `payments`: payment registration and allocation
- `reports`: sold client and aging buckets
- `exports`: CSV/XLSX generation
- `pdf`: PDF rendering

## Frontend integration
The backend is designed to be consumed by separate frontend apps. For local development, Vite/React frontends should set:

```env
VITE_API_URL=http://localhost:3000
```

Then call:

```js
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/invoices/from-order/${orderId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ serie: 'INV' })
});
```

The backend also allows CORS from common local frontend origins (`http://localhost:5173` and `http://localhost:3000`) and returns the API contract expected by the UI.

## Frontend API contract
The project now exposes a versioned API under `/api/v1` and keeps the legacy non-versioned routes for compatibility.

### Health
- `GET /api/v1/health`
- Response: `{ "status": "ok" }`

### Invoice creation
- `POST /api/v1/invoices/from-order/:orderId`
- Body: `{ "serie": "INV" }` (optional)
- Success: `201` with `{ "invoice": { ... } }`
- Errors: `422` invalid order id, `404` order not found, `409` order not delivered / invoice already exists, `500` internal error

### Dashboard summary for Alexei
- `GET /api/v1/dashboard/summary`
- Response example:
  ```json
  {
    "summary": {
      "todaySales": "42000.00",
      "monthSales": "450000.00",
      "pendingOrders": 34,
      "activeRoutes": 12,
      "totalReceivable": "120500.00"
    },
    "salesSeries": [{ "label": "01.09", "vanzari": 42000 }],
    "topClients": [{ "name": "Fabrica Sud SRL", "value": 184200 }],
    "topProducts": [{ "name": "Цемент Портланд 42.5", "value": 96 }]
  }
  ```

### Client list and details for Ivan
- `GET /api/v1/clients`
- Response example:
  ```json
  [
    { "id": 1, "name": "SRL Alpha", "balance": 5000, "maxDebtAge": 15 }
  ]
  ```
- `GET /api/v1/clients/:id`
- Response includes `invoices` and `paymentHistory` arrays.

### Invoice list and preview for Yana
- `GET /api/v1/invoices`
- Response example:
  ```json
  [{ "id": 1, "number": "INV-101", "pdfUrl": "/sample.pdf" }]
  ```
- `GET /api/v1/invoices/:id`
- Response includes full invoice payload for PDF and preview rendering.

### Aging report for all frontends
- `GET /api/v1/reports/aging`
- Response example:
  ```json
  {
    "buckets": [
      { "label": "0-30 дней", "total": "45000.00" },
      { "label": "31-60 дней", "total": "32000.00" },
      { "label": ">60 дней", "total": "43500.00" }
    ],
    "overdueInvoices": [
      { "no": "FCT-2231", "client": "Nord Distribuție", "value": "22100.00", "agingDays": 74 }
    ]
  }
  ```

This contract is the shared integration layer between the three frontend branches and the backend.
