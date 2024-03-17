import knex from 'knex';
import { config } from '../../config.js';
import logger from '../../logger.js';
import { kSql } from '../../tokens.js';
import { registerToken } from '../utils/tokens.js';

export async function createDatabase() {
  const sql = knex({
    client: 'postgres',
    connection: {
      host: config.PGHOST,
      port: config.PGPORT,
      user: config.PGUSER,
      password: config.PGPASSWORD,
      database: config.PGDATABASE,
    },
    pool: {
      min: 1,
      max: 5,
    },
  });

  await sql.raw(
    `
      set timezone = 'utc';
    `,
  );

  logger.success('[SQL]: Connected to database');
  registerToken(kSql, sql);
}
