import type { Video } from 'youtube-sr';
import type { song_source } from '../../@types/db-schema.js';
import { BASE_IMAGE_URL } from '../../constants/common.js';
import type { PossibleParent } from './resolveParent.js';
import { resolveParentMetadata } from './resolveParent.js';

export interface SongMetadata {
  album: {
    name: string;
    url: string;
  } | null;
  artist: {
    name: string;
    url: string;
  };
  duration: number;
  parent: {
    name: string;
    thumbnail: string | null;
    type: song_source;
    url: string;
  } | null;
  thumbnail: string;
  title: string;
  url: string;
}

function isSpotifyTrack(
  data: SpotifyApi.TrackObjectFull | SpotifyApi.TrackObjectSimplified | Video,
): data is Partial<SpotifyApi.TrackObjectFull> & SpotifyApi.TrackObjectSimplified {
  return (data as SpotifyApi.TrackObjectFull | SpotifyApi.TrackObjectSimplified).uri?.startsWith('spotify:track:');
}

function isYoutubeVideo(data: SpotifyApi.TrackObjectFull | SpotifyApi.TrackObjectSimplified | Video): data is Video {
  return (data as Video).url?.includes('youtube.com');
}

export function resolveSongMetadata(
  data: SpotifyApi.TrackObjectFull | SpotifyApi.TrackObjectSimplified | Video,
  parent: PossibleParent | null,
): SongMetadata {
  if (isSpotifyTrack(data)) {
    const { album, artists, duration_ms, name, external_urls } = data;

    return {
      title: name,
      url: external_urls.spotify,
      thumbnail: album?.images[0]?.url ?? BASE_IMAGE_URL,
      duration: duration_ms,
      artist: {
        name: artists[0]?.name ?? 'unknown',
        url: artists[0]?.external_urls.spotify ?? 'https://spotify.com',
      },
      album: album
        ? {
            name: album.name,
            url: album.external_urls.spotify,
          }
        : null,
      parent: resolveParentMetadata(parent),
    };
  }

  if (isYoutubeVideo(data)) {
    const { title, duration, url, channel } = data;

    return {
      title: title ?? 'unknown',
      url,
      thumbnail: data.thumbnail?.url ?? BASE_IMAGE_URL,
      duration: duration * 1_000,
      artist: {
        name: channel?.name ?? 'unknown',
        url: channel?.url ?? 'https://youtube.com',
      },
      album: null,
      parent: resolveParentMetadata(parent),
    };
  }

  throw new Error('Invalid song data');
}
