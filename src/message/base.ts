import { setTimeout } from 'node:timers';
import type { Guild, MessageReplyOptions, APIEmbed, Message } from 'discord.js';
import { container } from 'tsyringe';
import type { MusicQueue } from '../structures/Queue.js';
import { kMessage } from '../tokens.js';
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
let antiSpam: NodeJS.Timeout | null = null;
let lastQueue: MusicQueue | null = null;

export async function editQueueMessage(queue?: MusicQueue) {
	if (antiSpamCounter > 2 && queue) {
		lastQueue = queue;
		return;
	}

	const message = container.resolve<Message>(kMessage);

	await message.edit(generatePadronizedMessage(message.guild!, queue));
	antiSpamCounter++;

	if (queue) {
		// eslint-disable-next-line require-atomic-updates
		antiSpam = setTimeout(() => {
			antiSpam = null;
			antiSpamCounter = 0;
			void editQueueMessage(lastQueue!);
		}, 5_000);
	}
}
