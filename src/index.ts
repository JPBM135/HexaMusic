import 'reflect-metadata';
import process from 'node:process';
import { createClient } from './client.js';
import logger from './logger.js';
import { createPromRegistry } from './metrics.js';
import { sendErrorMessage } from './utils/textChannel.js';

createPromRegistry();

logger.debugEnabled = process.env.NODE_ENV === 'development';

await createClient();

process.on('unhandledRejection', (error) => {
	console.trace(error);
	void sendErrorMessage(error as Error);
});

process.on('uncaughtException', (error) => {
	console.trace(error);
	void sendErrorMessage(error as Error);
});
