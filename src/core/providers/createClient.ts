import { GatewayIntentBits, Client, ActivityType } from 'discord.js';
import { handleGuildCreate } from '../../handlers/events/guildCreate/handler.js';
import logger from '../../logger.js';
import { kDiscordClient } from '../../tokens.js';
import { registerToken } from '../utils/tokens.js';

export async function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
    presence: {
      activities: [
        {
          name: 'your heart beats',
          type: ActivityType.Listening,
        },
      ],
    },
  });

  client.on('guildCreate', handleGuildCreate);

  client.on('debug', (message) => logger.debug('[Client: debug]:', message));
  client.on('error', (error) => logger.error('[Client: error]:', error));
  client.on('warn', (message) => logger.warn('[Client: warn]:', message));
  client.rest.on('rateLimited', (info) => logger.warn('[REST: rateLimited]:', info));
  logger.info('[Client]: Debug event listeners registered');

  await client.login();

  logger.success(`[Client]: Client logged in as ${client.user?.tag ?? 'unknown#0'}`);

  registerToken(kDiscordClient, client);
}
