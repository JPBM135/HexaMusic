import type { GuildTextBasedChannel } from 'discord.js';
import { Client } from 'discord.js';
import { Gauge } from 'prom-client';
import { container } from 'tsyringe';
import { type ChannelsMap, EnvironmentalVariables } from '../constants.js';
import logger from '../logger.js';
import { generatePadronizedMessage } from '../message/base.js';
import SpotifyApi from '../structures/Spotify.js';
import { kChannels, kErrorChannel, kSpotify } from '../tokens.js';
import { resolveEnv } from '../utils/env.js';

new Gauge({
	name: 'hexa_music_discord_heartbeat_latency',
	help: 'Discord heartbeat latency',
	collect() {
		const client = container.resolve<Client>(Client);
		(this as Gauge).set(client.ws.ping);
	},
});

const channelMessages: ChannelsMap = new Map();

export const ReadyEvent = {
	name: 'ready',
	async execute(client: Client) {
		logger.success(`[Client]: Logged in as ${client.user?.tag}!`);

		const allowedChannels = resolveEnv(EnvironmentalVariables.QueryChannelsId).split(',');
		const editMessages = resolveEnv(EnvironmentalVariables.QueryMessagesId).split(',');

		for (const [idx, channelId] of allowedChannels.entries()) {
			const QueryChannel = (await client.channels.fetch(channelId)) as GuildTextBasedChannel;

			let QueryMessage = editMessages[idx]
				? await QueryChannel.messages.fetch(editMessages[idx]!).catch(() => null)
				: null;

			if (!QueryMessage) {
				QueryMessage = await QueryChannel.send(generatePadronizedMessage(QueryChannel.guild));
			}

			channelMessages.set(QueryChannel.guildId, {
				channel: QueryChannel,
				message: QueryMessage!,
			});

			logger.info(`Query channel registered: ${QueryChannel.name}`);
		}

		container.register(kChannels, { useValue: channelMessages });

		const SpotifyClient = new SpotifyApi();

		logger.info('Spotify client registered');

		container.register(kSpotify, { useValue: SpotifyClient });

		const ErrorChannel = (await client.channels.fetch(
			resolveEnv(EnvironmentalVariables.ErrorChannelId),
		)) as GuildTextBasedChannel;

		container.register(kErrorChannel, { useValue: ErrorChannel });

		logger.info(`Error channel registered: ${ErrorChannel.name}`);
	},
};
