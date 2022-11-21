import type { Client, GuildTextBasedChannel } from 'discord.js';
import { container } from 'tsyringe';
import { EnvironmentalVariables } from '../constants.js';
import { generatePadronizedMessage } from '../message/base.js';
import SpotifyApi from '../structures/Spotify.js';
import { kChannel, kErrorChannel, kMessage, kSpotify } from '../tokens.js';
import { resolveEnv } from '../utils/env.js';

export const ReadyEvent = {
	name: 'ready',
	async execute(client: Client) {
		console.log(`Logged in as ${client.user?.tag}!`);

		const QueryChannel = (await client.channels.fetch(
			resolveEnv(EnvironmentalVariables.QueryChannelId),
		)) as GuildTextBasedChannel;

		container.register(kChannel, { useValue: QueryChannel });

		const ErrorChannel = (await client.channels.fetch(
			resolveEnv(EnvironmentalVariables.ErrorChannelId),
		)) as GuildTextBasedChannel;

		container.register(kErrorChannel, { useValue: ErrorChannel });

		const QueryMessage = await QueryChannel.messages
			.fetch(resolveEnv(EnvironmentalVariables.QueryMessageId))
			.catch(() => null);

		if (!QueryMessage) {
			const message = await QueryChannel.send(generatePadronizedMessage(QueryChannel.guild));
			container.register(kMessage, { useValue: message });
		}

		container.register(kMessage, { useValue: QueryMessage });

		const SpotifyClient = new SpotifyApi(client);

		container.register(kSpotify, { useValue: SpotifyClient });
	},
};
