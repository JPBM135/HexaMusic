import { setTimeout } from 'node:timers';
import type { Message, Collection } from 'discord.js';
import { container } from 'tsyringe';
import { Emojis, EnvironmentalVariables } from '../constants.js';
import { MusicQueue } from '../structures/Queue.js';
import { kQueues } from '../tokens.js';
import { resolveEnv } from '../utils/env.js';
import { EmbedType, sendMessage } from '../utils/textChannel.js';

export const MessageCreateEvent = {
	name: 'messageCreate',
	async execute(message: Message) {
		if (message.author.bot || !message.inGuild()) return;

		if (message.content === 'hexa!ping') {
			await message.reply('Pong!');
		}

		if (message.channel.id !== resolveEnv(EnvironmentalVariables.QueryChannelId)) return;

		if (!message.member?.voice?.channel) {
			await sendMessage(`${Emojis.RedX} | Você precisa estar em um canal de voz!`, EmbedType.Error);
			return;
		}

		setTimeout(async () => message.delete(), 500);

		const queues = container.resolve<Collection<string, MusicQueue>>(kQueues);

		const queue = queues.ensure(message.guildId!, () => {
			const voice = message.member?.voice.channel;
			return new MusicQueue(message.guild, voice!);
		});

		if (queue.voiceChannel.id !== message.member?.voice.channel.id) {
			await sendMessage(`${Emojis.RedX} | Você precisa estar no mesmo canal de voz que eu!`, EmbedType.Error);
			return;
		}

		if (!queue.isConnected()) {
			await queue.connect();
		}

		await queue.query(message.content, message.member);
	},
};
