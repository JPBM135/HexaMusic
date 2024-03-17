import process from 'node:process';
import logger from '../../logger.js';
import { kDiscordClient, kSql } from '../../tokens.js';
import { resolveToken } from '../utils/tokens.js';

let isAlreadyShuttingDown = false;

export function createProcessListeners() {
  const sql = resolveToken(kSql);
  const discordClient = resolveToken(kDiscordClient);

  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
  });

  const shutdownHandler = async () => {
    if (isAlreadyShuttingDown) {
      return;
    }

    isAlreadyShuttingDown = true;
    logger.info('Shutting down...');

    if (sql) {
      await sql.destroy();
      logger.info('SQL connection closed');
    }

    if (discordClient) {
      await discordClient.destroy();
      logger.info('Discord client destroyed');
    }

    process.exit(0);
  };

  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);

  logger.success('[Process]: SIG* listeners registered');
}
