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
import { EmbedColors, Emojis } from '../constants.js';
import { kChannel, kErrorChannel } from '../tokens.js';

export enum EmbedType {
	None,
	Info,
	Error,
}

export async function sendMessage(payload: MessageReplyOptions | string, embed = EmbedType.Info) {
	const channel = container.resolve<GuildTextBasedChannel>(kChannel);
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

	setTimeout(async () => message?.delete(), 7_000);

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

	setTimeout(async () => interaction?.deleteReply(), 7_000);
}

export async function sendErrorMessage(error: Error): Promise<void> {
	const msg = await sendMessage(
		`${Emojis.RedX} | An error occurred ${error.message}:\n${codeBlock('js', error.message)}`,
		EmbedType.Error,
	);

	const ErrorChannel = container.resolve<GuildTextBasedChannel>(kErrorChannel);

	await ErrorChannel.send({
		embeds: msg.embeds,
	});
}
