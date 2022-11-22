import { SPOTIFY_REGEX, YOUTUBE_REGEX } from '../constants.js';
import { QueryMode } from '../structures/Queue.js';

export function findQueryMode(query: string) {
	if (YOUTUBE_REGEX.playlist.test(query)) {
		return QueryMode.YoutubePlaylist;
	}

	if (YOUTUBE_REGEX.video.test(query)) {
		return QueryMode.YoutubeVideo;
	}

	if (SPOTIFY_REGEX.playlist_no_query.test(query)) {
		return QueryMode.SpotifyPlaylist;
	}

	if (SPOTIFY_REGEX.track_no_query.test(query)) {
		return QueryMode.SpotifyTrack;
	}

	if (SPOTIFY_REGEX.album_no_query.test(query)) {
		return QueryMode.SpotifyAlbum;
	}

	if (SPOTIFY_REGEX.artist_no_query.test(query)) {
		return QueryMode.SpotifyArtist;
	}

	return QueryMode.Search;
}

export function findFlags(query: string, flagsToFind: string[]) {
	const flags = flagsToFind.flatMap((flag) => {
		return [`--${flag}`, `-${flag[0]}`];
	});

	return flags.some((flag) => query.includes(flag));
}
