# invoicing-backend

Backend for invoicing, delivery routes, and data export.

## Project structure

`
src/
  app.js           - API routes and handlers
  server.js        - server startup (port 3000)
  db/              - PostgreSQL connection
  modules/
    reports/       - queries: routes, reports, summaries
    documents/     - invoice and delivery note lifecycle
    payments/      - payment registration
    exports/       - CSV/XLSX generation
    pdf/           - PDF rendering
migrations/        - SQL migrations (001-033)
`

## Main database tables

- routes - route registry (code, name, driver, status, direction, dates, aggregates)
- route_stops - route stops (order, recipient, supplier, goods, address, amount, status)
- orders - orders
- order_items - order line items
- clients - clients
- suppliers - suppliers
- invoices - invoices
- payments - payments
- migrations - applied migration tracking

## Migrations (main)

- 001_init.sql - base schema
- 021_order_delivery_address.sql - delivery address
- 022_route_details.sql - driver, status, stop ordering
- 023_route_report_view.sql - reporting view
- 024_route_stops_on_routes.sql - route stops normalization
- 025_normalize_route_stops.sql - routes.stops removed, route_stops table created
- 026_route_summary_columns.sql - route aggregates
- 027_route_lifecycle_fields.sql - lifecycle dates
- 028_route_direction_fields.sql - direction fields
- 029_route_sorting_indexes.sql - sorting indexes
- 030_diverse_route_scenarios.sql - diverse demo routes
- 031_complete_route_demo_fields.sql - legacy route backfill
- 032_populate_route_04.sql - R-04 data
- 033_route_integrity_and_timestamps.sql - constraints and updated_at trigger

## API v1

### Routes

- GET /api/v1/routes - list routes (filter: ?status=active or inactive)
- GET /api/v1/routes/:id/stops - paginated stops (filter: ?status=pending|delivered; params: limit 1-500 default 50, offset 0)
- PATCH /api/v1/routes/:id - update (driverName, status, orderedOrderIds)

### Documents

- POST /api/v1/invoices/from-order/:orderId
- GET /api/v1/invoices
- GET /api/v1/invoices/:id

### Orders

- GET /api/v1/orders

### Clients

- GET /api/v1/clients
- GET /api/v1/clients/:id

### Products

- GET /api/v1/products

### Reports

- GET /api/v1/reports/aging
- GET /api/v1/dashboard/summary

### Exports

- GET /api/v1/exports/report.csv
- GET /api/v1/exports/report.xlsx

### Health

- GET /health -> { status: ok }

## Route contract

`json
{
  id: R-102,
  routeCode: R-102,
  name: Chișinău - Bălți Express,
  driver: Ion Popescu,
  status: В пути,
  routeStatus: in_progress,
  origin: { name: Depozit Central, address: str. Industrială 14, Chișinău },
  destination: { name: Metalcom Bălți, address: str. Atelierelor 23, Bălți },
  plannedStartAt: ...,
  startedAt: ...,
  completedAt: null,
  createdAt: ...,
  updatedAt: ...,
  orderCount: 1,
  totalAmount: 32400.00,
  deliveredStopCount: 0,
  pendingStopCount: 1,
  stops: [ ... ]
}
`

## Route Stop contract (GET /routes/:id/stops)

`json
{
  total: 2,
  items: [
    {
      id: 105,
      routeId: 105,
      orderId: 105,
      orderNumber: ORD-DEMO-105,
      stopOrder: 1,
      status: pending,
      amount: 22100.00,
      createdAt: ...,
      deliveredAt: null,
      recipient: { id: 1, name: Fabrica Sud, address: ... },
      sender: { id: 11, name: Materiale Sud SRL, address: ... },
      goods: [ ... ]
    }
  ]
}
`

## Technologies

- express - HTTP server
- pg - PostgreSQL client
- pdfkit - PDF
- xlsx - Excel export
- node --test - built-in tests

## Commands

`ash
npm test
npm run migrate
npm start
`

## Ignored files

.env, .env.*, node_modules/, ARCHITECTURE_IMPROVEMENTS.md, frontend-handoff.md, stderr*.txt, stdout*.txt, *.log, *.bak.
