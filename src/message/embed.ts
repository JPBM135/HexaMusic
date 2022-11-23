import {
	type Guild,
	type APIEmbedAuthor,
	hyperlink,
	inlineCode,
	time,
	TimestampStyles,
	type APIEmbedFooter,
} from 'discord.js';
import type { MusicQueue } from '../structures/Queue.js';

export function generateAuthor(guild: Guild, queue?: MusicQueue): APIEmbedAuthor {
	return {
		name: queue?.isPlaying()
			? `${queue.nowPlaying.requester.displayName} | Tocando agora${queue.nowPlaying.isLive ? ' (Live)' : ''}!`
			: `Fila de músicas para ${guild.name}`,
		icon_url: queue?.nowPlaying?.requester.displayAvatarURL({ size: 128 }) ?? guild.iconURL({ size: 128 }) ?? undefined,
	};
}

export function generateDescription(queue?: MusicQueue): string {
	if (!queue?.nowPlaying) {
		return [
			'**Nenhuma música tocando no momento.**',
			'> Envie uma música, playlist ou link nesse canal para começar a tocar.',
		].join('\n');
	}

	const { nowPlaying } = queue;

	return [
		`**Tocando agora:** ${hyperlink(inlineCode(nowPlaying.name), nowPlaying.originalUrl)}`,
		`**Canal:** ${hyperlink(inlineCode(nowPlaying.channel), nowPlaying.originalChannelUrl)}`,
		`**Duração:** ${
			nowPlaying.isLive
				? inlineCode('Livestream')
				: inlineCode(nowPlaying._data.video?.durationFormatted ?? 'Desconhecido')
		} (${time(nowPlaying.endDate, TimestampStyles.RelativeTime)})`,
	].join('\n');
}

export function generateFooter(guild: Guild, queue?: MusicQueue): APIEmbedFooter {
	return {
		text: queue?.isPlaying()
			? `Fila: ${queue.queue.length} música(s) | Duração: ${queue.durationFormatted} | Volume: ${queue.formattedVolume}`
			: 'Nenhuma música tocando no momento.',
		icon_url: guild.iconURL({ size: 128 }) ?? undefined,
	};
}
