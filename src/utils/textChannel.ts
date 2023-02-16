import { setTimeout } from 'node:timers';
import {
	type MessageReplyOptions,
	type InteractionReplyOptions,
	type GuildTextBasedChannel,
	type Message,
	type RepliableInteraction,
	codeBlock,
} from 'discord.js';
import { container } from 'tsyringe';
import type { ChannelsMap } from '../constants.js';
import { DELETE_MESSAGE_TIMEOUT, EmbedColors, Emojis } from '../constants.js';
import { kChannels, kErrorChannel } from '../tokens.js';

export enum EmbedType {
	None,
	Info,
	Error,
}

export async function sendMessage(guildId: string, payload: MessageReplyOptions | string, embed = EmbedType.Info) {
	const channelGuild = container.resolve<ChannelsMap>(kChannels);

	const channel = channelGuild.get(guildId)!.channel;

	let message: Message<true> | null = null;

	if (typeof payload === 'string' && embed !== EmbedType.None) {
		message = await channel.send({
			embeds: [
				{
					color: embed === EmbedType.Info ? EmbedColors.Information : EmbedColors.Error,
					description: payload,
				},
			],
		});
	} else {
		message = await channel.send(payload);
	}

	setTimeout(async () => message?.delete(), DELETE_MESSAGE_TIMEOUT);

	return message;
}

export async function sendInteraction(
	interaction: RepliableInteraction,
	payload: InteractionReplyOptions | string,
	embed = EmbedType.Info,
) {
	if (typeof payload === 'string' && embed !== EmbedType.None) {
		await interaction.reply({
			embeds: [
				{
					color: embed === EmbedType.Info ? EmbedColors.Information : EmbedColors.Error,
					description: payload,
				},
			],
			ephemeral: embed === EmbedType.Error,
		});
	} else {
		await interaction.reply(payload);
	}

	if (interaction.ephemeral) return;

	setTimeout(async () => interaction?.deleteReply(), DELETE_MESSAGE_TIMEOUT);
}

export async function sendErrorMessage(error: Error, guildId?: string): Promise<void> {
	const text = `${Emojis.RedX} | An error occurred ${error.message}:\n${codeBlock('js', error.message)}`;

	if (guildId) {
		await sendMessage(guildId, text, EmbedType.Error);
	}

	const ErrorChannel = container.resolve<GuildTextBasedChannel>(kErrorChannel);

	await ErrorChannel.send({
		embeds: [
			{
				color: EmbedColors.Error,
				description: text,
			},
		],
	});
}
