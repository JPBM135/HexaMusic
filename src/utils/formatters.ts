import { inlineCode, hyperlink } from 'discord.js';
import { Emojis } from '../constants.js';
import { formatDate } from './date.js';

export function formatPlaylistMessage(args: {
	channelName: string;
	channelUrl: string;
	duration: number;
	inverse: boolean;
	playlistName: string;
	playlistUrl: string;
	trackCount: number;
}): string {
	const { trackCount, duration, playlistName, playlistUrl, channelName, channelUrl, inverse } = args;

	const parts = [
		`${Emojis.Playlist} | Adicionei ${inlineCode(String(trackCount))} músicas da playlist ${hyperlink(
			inlineCode(playlistName),
			playlistUrl,
		)} de ${hyperlink(inlineCode(channelName), channelUrl)} à fila!`,
		`> Duração total: ${inlineCode(formatDate(duration))}`,
	];

	if (inverse) {
		parts.push(`> A ordem das músicas foi invertida!`);
	}

	return parts.join('\n');
}
