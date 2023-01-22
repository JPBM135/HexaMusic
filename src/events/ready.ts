import type { GuildTextBasedChannel } from 'discord.js';
import { Client } from 'discord.js';
import { Gauge } from 'prom-client';
import { container } from 'tsyringe';
import { EnvironmentalVariables } from '../constants.js';
import logger from '../logger.js';
import { generatePadronizedMessage } from '../message/base.js';
import SpotifyApi from '../structures/Spotify.js';
import { kChannel, kErrorChannel, kMessage, kSpotify } from '../tokens.js';
import { resolveEnv } from '../utils/env.js';

new Gauge({
	name: 'hexa_music_discord_heartbeat_latency',
	help: 'Discord heartbeat latency',
	collect() {
		const client = container.resolve<Client>(Client);
		(this as Gauge).set(client.ws.ping);
	},
});

export const ReadyEvent = {
	name: 'ready',
	async execute(client: Client) {
		logger.success(`[Client]: Logged in as ${client.user?.tag}!`);

		const QueryChannel = (await client.channels.fetch(
			resolveEnv(EnvironmentalVariables.QueryChannelId),
		)) as GuildTextBasedChannel;

		logger.info(`Query channel registered: ${QueryChannel.name}`);

		container.register(kChannel, { useValue: QueryChannel });

		const QueryMessage = await QueryChannel.messages
			.fetch(resolveEnv(EnvironmentalVariables.QueryMessageId))
			.catch(() => null);

		if (!QueryMessage) {
			const message = await QueryChannel.send(generatePadronizedMessage(QueryChannel.guild));
			container.register(kMessage, { useValue: message });
		}

		logger.info(`Query message registered: ${QueryMessage?.id}`);

		container.register(kMessage, { useValue: QueryMessage });

		const SpotifyClient = new SpotifyApi();

		logger.info('Spotify client registered');

		container.register(kSpotify, { useValue: SpotifyClient });

		if (resolveEnv(EnvironmentalVariables.ErrorChannelId)) {
			const ErrorChannel = (await client.channels.fetch(
				resolveEnv(EnvironmentalVariables.ErrorChannelId),
			)) as GuildTextBasedChannel;

			container.register(kErrorChannel, { useValue: ErrorChannel });

			logger.info(`Error channel registered: ${ErrorChannel.name}`);
		}
	},
};
