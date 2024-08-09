import { setTimeout } from 'node:timers';
import type { Message /* , Collection */ } from 'discord.js';
import { container } from 'tsyringe';
import type { ChannelsMap } from '../constants.js';
import { EnvironmentalVariables, Emojis } from '../constants.js';
// import { MusicQueue } from '../structures/Queue.js';
import { kChannels /* , kQueues */ } from '../tokens.js';
import { resolveEnv } from '../utils/env.js';
import { EmbedType, sendMessage } from '../utils/textChannel.js';

export const MessageCreateEvent = {
	name: 'messageCreate',
	async execute(message: Message) {
		if (message.author.bot || !message.inGuild()) return;

		if (message.content === `${resolveEnv(EnvironmentalVariables.Prefix)}!ping`) {
			await message.reply('Pong!');
		}

		const channels = container.resolve<ChannelsMap>(kChannels);

		if (!channels.some((channel) => channel.channel.id === message.channel.id)) return;

		setTimeout(async () => message.delete(), 500);

		await sendMessage(
			message.guildId,
			`${Emojis.OrangeConnection} | Estamos enfrentando problemas com o YouTube e infelizmente não tenho o tempo para resolver esses problemas agora, espero que vcs entendam - JPBM135`,
			EmbedType.Error,
		);

		// if (!message.member?.voice?.channel) {
		// 	await sendMessage(message.guildId, `${Emojis.RedX} | Você precisa estar em um canal de voz!`, EmbedType.Error);
		// 	return;
		// }

		// const queues = container.resolve<Collection<string, MusicQueue>>(kQueues);

		// const queue = queues.ensure(message.guildId, () => {
		// 	const voice = message.member?.voice.channel;
		// 	return new MusicQueue(message.guild, voice!);
		// });

		// if (queue.voiceChannel.id !== message.member?.voice.channel.id) {
		// 	await sendMessage(
		// 		message.guildId,
		// 		`${Emojis.RedX} | Você precisa estar no mesmo canal de voz que eu!`,
		// 		EmbedType.Error,
		// 	);
		// 	return;
		// }

		// if (!queue.isConnected()) {
		// 	await queue.connect();
		// }

		// await queue.query(message.content, message.member);
	},
};
