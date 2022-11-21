import { SPOTIFY_REGEX, YOUTUBE_REGEX } from '../constants.js';

export function validateStatusCode(statusCode: number): boolean {
	return Boolean(statusCode >= 200 && statusCode < 300);
}

export function isMany(query: string): boolean {
	const regexes = [YOUTUBE_REGEX.playlist, SPOTIFY_REGEX.album, SPOTIFY_REGEX.playlist, SPOTIFY_REGEX.artist];

	return regexes.some((regex) => regex.test(query));
}
