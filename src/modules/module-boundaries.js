const moduleBoundaries = {
  documents: {
    responsibility: 'Invoice and borderou lifecycle per business rules',
    dependsOn: ['numbering', 'pdf']
  },
  numbering: {
    responsibility: 'Series + sequential number allocation without gaps under concurrency',
    dependsOn: []
  },
  payments: {
    responsibility: 'Payment registration and allocation to invoices',
    dependsOn: ['documents']
  },
  reports: {
    responsibility: 'Client balance and debt aging (0-30, 31-60, >60 days)',
    dependsOn: ['documents', 'payments']
  },
  exports: {
    responsibility: 'CSV/XLSX exports for date intervals',
    dependsOn: ['reports']
  },
  pdf: {
    responsibility: 'PDF rendering for invoices and route borderou',
    dependsOn: ['documents']
  }
};

module.exports = { moduleBoundaries };
