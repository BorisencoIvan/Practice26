const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString }) : null;

function createUnavailableClient() {
  return {
    query: async () => {
      throw new Error('DATABASE_UNAVAILABLE');
    },
    release: () => {}
  };
}

module.exports = {
  query: async (text, params) => {
    if (!pool) {
      throw new Error('DATABASE_UNAVAILABLE');
    }
    return pool.query(text, params);
  },
  getClient: async () => {
    if (!pool) {
      return createUnavailableClient();
    }
    return pool.connect();
  }
};
