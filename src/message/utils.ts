import { EmbedColors, Emojis } from '../constants.js';
import { type Music, VideoSource } from '../structures/Songs.js';

export function getEmoji(music: Music) {
	const { source, isLive } = music;

	if (isLive) return Emojis.Live;

	switch (source) {
		case VideoSource.Youtube:
			return Emojis.Youtube;
		case VideoSource.Spotify:
			return Emojis.Spotify;
		case VideoSource.AutoPlay:
			return Emojis.Stream;
	}
}

export function getColor(source?: VideoSource) {
	switch (source) {
		case VideoSource.Youtube:
			return EmbedColors.Youtube;
		case VideoSource.Spotify:
			return EmbedColors.Spotify;
		case VideoSource.AutoPlay:
			return EmbedColors.AutoPlay;
		default:
			return EmbedColors.NoMusic;
	}
}
