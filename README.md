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

### Routes
- `GET /api/v1/routes`
- Optional filter: `?status=active` returns routes not marked completed; `?status=inactive` returns completed routes.
- Routes are sorted by default with active routes first (`in_progress`, then `planned`), completed routes last, and then by route name. Stops are sorted by route, `stop_order`, creation time, and ID.
- Each route includes its display ID, database name, assigned driver, status (`planned`, `in_progress`, or `completed`), order count, and ordered `stops` array. Each stop represents an order and includes its database ID and display ID, recipient name/address, supplier name/address, goods (product name/variant/unit/quantity/price/VAT/line amount), order status/label, order amount, creation time, and delivery time.
- `PATCH /api/v1/routes/:id` updates route details. Body may include `driverName` (string or `null`), `status` (`planned`, `in_progress`, `completed`), and/or `orderedOrderIds` (all order database IDs on that route, each exactly once, in the desired stop order).
- `routes` is the complete route registry: active and completed routes remain in this table, with route code, name, origin, destination, driver, status, lifecycle/planning timestamps, stop count, total amount, and delivered/pending stop counts. `route_stops` contains the stops belonging to every route, including completed routes; recipient/sender fields are separate columns and goods remain in `order_items`. Use `?status=active` for active routes or `?status=inactive` for completed routes. Migration `028_route_direction_fields.sql` adds and populates route direction fields; `029_route_sorting_indexes.sql` adds sorting indexes.
- Migration `030_diverse_route_scenarios.sql` adds varied demo routes: planned, in-progress, completed, empty, single-stop, and multi-stop routes with different drivers, suppliers, recipients, addresses, amounts, and delivery statuses.
- Migration `031_complete_route_demo_fields.sql` backfills route direction, driver, planned-start, and estimated-arrival fields for legacy demo routes.
- `GET /api/v1/routes/:id/stops` returns paginated stops for one route. Optional query parameters: `status=pending|delivered`, `limit` (1-500, default 50), and `offset` (default 0). The response is `{ total, items }`.
- Migration `033_route_integrity_and_timestamps.sql` enforces unique route codes, valid stop amounts/status/order, chronological route dates, unique stop positions, and automatic `routes.updated_at` updates.

### Debt export
- `GET /api/v1/exports/report.xlsx` and `/api/v1/exports/report.csv` recognize debt-report columns (`total_debt`, `due_date`, `days_overdue`, `aging_bucket`, `last_payment_date`) and return one row per unpaid invoice. Existing sales column selections continue to return sales exports.
- Select columns with `columns`, `selectedColumns`, or `fields`; supported debt fields are `id`, `client`, `total_debt`, `due_date`, `days_overdue`, `aging_bucket`, `last_payment_date`, `manager`, and `status`.
- Optional `from` and `to` dates filter by invoice due date, inclusively.

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
