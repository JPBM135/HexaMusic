import { setTimeout } from 'node:timers';
import type { Guild, MessageReplyOptions, APIEmbed, Message } from 'discord.js';
import { container } from 'tsyringe';
import type { MusicQueue } from '../structures/Queue.js';
import { kMessage } from '../tokens.js';
import { resolveQueue } from '../utils/resolveQueue.js';
import { generatePadronizedComponents } from './components.js';
import { generateContent } from './content.js';
import { generateAuthor, generateDescription, generateFooter } from './embed.js';
import { getColor } from './utils.js';

export function generatePadronizedMessage(guild: Guild, queue?: MusicQueue): MessageReplyOptions {
	const embed: APIEmbed = {
		author: generateAuthor(guild, queue),
		color: getColor(queue?.nowPlaying?.source),
		description: generateDescription(queue),
		image: {
			url: queue?.nowPlaying?.thumbnail ?? 'https://i.imgur.com/9D2qEgU.png',
		},
		footer: generateFooter(guild, queue),
	};

	return {
		content: generateContent(guild, queue),
		embeds: [embed],
		components: generatePadronizedComponents(!queue?.isPlaying(), queue),
	};
}

let antiSpamCounter = 0;

export async function editQueueMessage() {
	if (antiSpamCounter > 2) return;

	const message = container.resolve<Message>(kMessage);

	await message.edit(generatePadronizedMessage(message.guild!, resolveQueue(message.guildId!)));
	antiSpamCounter++;

	if (antiSpamCounter > 2) {
		// eslint-disable-next-line require-atomic-updates
		setTimeout(() => {
			antiSpamCounter = 0;
			void editQueueMessage();
		}, 5_000).unref();
	}
}
