import { type Guild, userMention } from 'discord.js';
import { Emojis } from '../constants.js';
import type { MusicQueue } from '../structures/Queue.js';
import { VideoSource } from '../structures/Songs.js';
import { getEmoji } from './utils.js';

export function generateContent(guild: Guild, queue?: MusicQueue): string {
	const boilerplate = [`**${Emojis.Queue} Fila de reprodução de ${guild.name}**`, ''];

	if (!queue?.queue.length) {
		return [
			...boilerplate,
			`${Emojis.Music} Não há ${queue?.isPlaying() ? 'músicas na fila' : 'nada tocando no momento'}. ${Emojis.Music}`,
		].join('\n');
	}

	const parsedQueue: string[] = queue.queue.map(
		(music, index) =>
			`**${index + 1}-** ${getEmoji(music.source)} | ${music.name} ➜ ${userMention(
				music.source === VideoSource.AutoPlay ? guild.client.user.id : music.requester.id,
			)}`,
	);

	if (parsedQueue.join('\n').length > 1_900) {
		while (parsedQueue.join('\n').length > 1_900) {
			parsedQueue.pop();
		}

		parsedQueue.push(`... e mais ${queue.queue.length - parsedQueue.length} música(s).`);
	}

	parsedQueue.reverse();

	return [...boilerplate, ...parsedQueue].join('\n');
}
