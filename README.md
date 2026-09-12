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

## Run
1. Install dependencies: `npm install`
2. Copy environment template: `.env.example -> .env`
3. Start: `npm run start`
