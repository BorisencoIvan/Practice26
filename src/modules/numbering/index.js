const db = require('../../db');
const { moduleBoundaries } = require('../module-boundaries');

async function allocateNextNumber({ docType, serie }) {
  if (!docType || !serie) {
    throw new Error('docType and serie are required');
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    let counter = await client.query(
      `SELECT current_number FROM document_counters
       WHERE doc_type = $1 AND serie = $2
       FOR UPDATE`,
      [docType, serie]
    );

    if (counter.rowCount === 0) {
      await client.query(
        'INSERT INTO document_counters (doc_type, serie, current_number) VALUES ($1, $2, 0)',
        [docType, serie]
      );

      counter = await client.query(
        `SELECT current_number FROM document_counters
         WHERE doc_type = $1 AND serie = $2
         FOR UPDATE`,
        [docType, serie]
      );
    }

    const nextNumber = Number(counter.rows[0].current_number) + 1;

    await client.query(
      'UPDATE document_counters SET current_number = $3 WHERE doc_type = $1 AND serie = $2',
      [docType, serie, nextNumber]
    );

    await client.query('COMMIT');

    return {
      docType,
      serie,
      number: nextNumber
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function getNumberingModuleInfo() {
  return moduleBoundaries.numbering;
}

module.exports = {
  allocateNextNumber,
  getNumberingModuleInfo
};
