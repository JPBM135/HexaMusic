import { setTimeout } from 'node:timers';
import type { Message, Collection } from 'discord.js';
import { container } from 'tsyringe';
import type { ChannelsMap } from '../constants.js';
import { Emojis } from '../constants.js';
import { MusicQueue } from '../structures/Queue.js';
import { kChannels, kQueues } from '../tokens.js';
import { EmbedType, sendMessage } from '../utils/textChannel.js';

export const MessageCreateEvent = {
	name: 'messageCreate',
	async execute(message: Message) {
		const channels = container.resolve<ChannelsMap>(kChannels);

		if (message.author.bot || !message.inGuild()) return;

		if (message.content === 'hexa!ping') {
			await message.reply('Pong!');
		}

		if (!channels.has(message.guildId)) return;

		setTimeout(async () => message.delete(), 500);

		if (!message.member?.voice?.channel) {
			await sendMessage(message.guildId, `${Emojis.RedX} | Você precisa estar em um canal de voz!`, EmbedType.Error);
			return;
		}

		const queues = container.resolve<Collection<string, MusicQueue>>(kQueues);

		const queue = queues.ensure(message.guildId, () => {
			const voice = message.member?.voice.channel;
			return new MusicQueue(message.guild, voice!);
		});

		if (queue.voiceChannel.id !== message.member?.voice.channel.id) {
			await sendMessage(
				message.guildId,
				`${Emojis.RedX} | Você precisa estar no mesmo canal de voz que eu!`,
				EmbedType.Error,
			);
			return;
		}

		if (!queue.isConnected()) {
			await queue.connect();
		}

		await queue.query(message.content, message.member);
	},
};
