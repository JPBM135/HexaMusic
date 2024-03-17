import 'reflect-metadata';
import process from 'node:process';
import { createClient } from './core/providers/createClient.js';
import { createDatabase } from './core/providers/createDatabase.js';
import { createI18Next } from './core/providers/createI18next.js';
import { createProcessListeners } from './core/providers/createProcessListeners.js';
import { createSnowflakeSingleton } from './core/providers/createSnowflakeSingleton.js';
import logger from './logger.js';

createSnowflakeSingleton();

await createI18Next();

await createDatabase();

logger.debugEnabled = process.env.NODE_ENV === 'development';

await createClient();

createProcessListeners();

logger.success('[System]: Ready!');
