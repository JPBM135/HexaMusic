import { setTimeout } from 'node:timers';
import type { Guild, APIEmbed, MessageEditOptions, MessageCreateOptions } from 'discord.js';
import { container } from 'tsyringe';
import type { ChannelsMap } from '../constants.js';
import type { MusicQueue } from '../structures/Queue.js';
import { kChannels } from '../tokens.js';
import { resolveQueue } from '../utils/resolveQueue.js';
import { generatePadronizedComponents } from './components.js';
import { generateContent } from './content.js';
import { generateAuthor, generateDescription, generateFooter } from './embed.js';
import { getColor } from './utils.js';

export function generatePadronizedMessage(guild: Guild, queue?: MusicQueue): MessageCreateOptions {
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

export async function editQueueMessage(guildId: string) {
	if (antiSpamCounter > 2) return;

	const message = container.resolve<ChannelsMap>(kChannels).get(guildId)?.message;

	if (!message) return;

	await message.edit(generatePadronizedMessage(message.guild!, resolveQueue(message.guildId!)) as MessageEditOptions);
	antiSpamCounter++;

	if (antiSpamCounter > 2) {
		// eslint-disable-next-line require-atomic-updates
		setTimeout(() => {
			antiSpamCounter = 0;
			void editQueueMessage(guildId);
		}, 5_000).unref();
	}
}
