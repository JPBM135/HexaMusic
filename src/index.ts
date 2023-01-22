import 'reflect-metadata';
import process from 'node:process';
import { Client, Collection, GatewayIntentBits, type VoiceState } from 'discord.js';
import { container } from 'tsyringe';
import { ComponentHandlerEvent } from './events/componentHandler.js';
import { MessageCreateEvent } from './events/messageCreate.js';
import { ReadyEvent } from './events/ready.js';
import { VoiceStateEvent } from './events/voiceState.js';
import logger from './logger.js';
import type { MusicQueue } from './structures/Queue.js';
import { kQueues } from './tokens.js';
import { sendErrorMessage } from './utils/textChannel.js';

logger.debugEnabled = process.env.NODE_ENV === 'development';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates,
	],
});

container.register(Client, { useValue: client });

const queues = new Collection<string, MusicQueue>();

container.register(kQueues, { useValue: queues });

client.on('ready', async () => ReadyEvent.execute(client));
logger.info('Ready event registered');

client.on('messageCreate', async (message) => MessageCreateEvent.execute(message));
logger.info('MessageCreate event registered');

client.on('interactionCreate', async (interaction) => ComponentHandlerEvent.execute(interaction));
logger.info('ButtonHandler event registered');

client.on('voiceStateUpdate', async (oldState, newState) =>
	VoiceStateEvent.execute(oldState as VoiceState, newState as VoiceState),
);
logger.info('VoiceState event registered');

client.on('debug', (message) => logger.debug('[Client: debug]:', message));
client.on('error', (error) => logger.error('[Client: error]:', error));
client.on('warn', (message) => logger.warn('[Client: warn]:', message));
client.rest.on('rateLimited', (info) => logger.warn('[REST: rateLimited]:', info));
logger.info('Debug event listeners registered');

process.on('unhandledRejection', (error) => {
	console.trace(error);
	void sendErrorMessage(error as Error);
});

process.on('uncaughtException', (error) => {
	console.trace(error);
	void sendErrorMessage(error as Error);
});

await client.login();
