import process from 'node:process';
import Sql from 'postgres';

const sql = Sql({
  database: 'postgres',
  host: process.env.PGHOST,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
});

await sql.unsafe(`
  set timezone to 'utc';
`);

const knownLocalhosts = ['localhost', '127.0.0.1', '0.0.0.0'];

if (!knownLocalhosts.includes(process.env.PGHOST || '')) {
  throw new Error('This script should only be run locally');
}

const databaseName = process.env.PGDATABASE;

console.log(`[RESET-DB]: Resetting database ${databaseName}`);

await sql.unsafe(`
	drop database if exists ${databaseName} with (force);
`);

console.log(`[RESET-DB]: Creating database ${databaseName}`);

await sql.unsafe(`
	create database ${databaseName};
`);

console.log(`[RESET-DB]: Success!`);

process.exit(0);
