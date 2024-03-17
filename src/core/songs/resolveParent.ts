import type { Channel, Playlist } from 'youtube-sr';
import { SongSource } from '../../@types/enums.js';
import type { SongMetadata } from './resolveMetadata.js';

export type PossibleParent =
  | Channel
  | Playlist
  | SpotifyApi.AlbumObjectFull
  | SpotifyApi.ArtistObjectFull
  | SpotifyApi.PlaylistObjectFull;

function isYoutubeChannel(data: PossibleParent): data is Channel {
  return Boolean((data as Channel).url?.includes('youtube.com') && (data as Channel).type === 'channel');
}

function isYoutubePlaylist(data: PossibleParent): data is Playlist {
  return Boolean((data as Playlist).url?.includes('youtube.com') && (data as Playlist).type === 'playlist');
}

function isSpotifyAlbum(data: PossibleParent): data is SpotifyApi.AlbumObjectFull {
  return (data as SpotifyApi.AlbumObjectFull).uri?.startsWith('spotify:album:');
}

function isSpotifyArtist(data: PossibleParent): data is SpotifyApi.ArtistObjectFull {
  return (data as SpotifyApi.ArtistObjectFull).uri?.startsWith('spotify:artist:');
}

function isSpotifyPlaylist(data: PossibleParent): data is SpotifyApi.PlaylistObjectFull {
  return (data as SpotifyApi.PlaylistObjectFull).uri?.startsWith('spotify:playlist:');
}

export function resolveParentMetadata(parent: PossibleParent | null): SongMetadata['parent'] {
  if (parent === null) return null;

  if (isYoutubeChannel(parent)) {
    return {
      name: parent.name ?? 'unknown',
      thumbnail: parent.iconURL(),
      type: SongSource.YoutubeChannel,
      url: parent.url ?? 'https://youtube.com',
    };
  }

  if (isYoutubePlaylist(parent)) {
    return {
      name: parent.title ?? 'unknown',
      thumbnail: parent.thumbnail?.url ?? null,
      type: SongSource.YoutubePlaylist,
      url: parent.url ?? 'https://youtube.com',
    };
  }

  if (isSpotifyAlbum(parent)) {
    return {
      name: parent.name,
      thumbnail: parent.images[0]?.url ?? null,
      type: SongSource.SpotifyAlbum,
      url: parent.external_urls.spotify,
    };
  }

  if (isSpotifyArtist(parent)) {
    return {
      name: parent.name,
      thumbnail: parent.images[0]?.url ?? null,
      type: SongSource.SpotifyArtist,
      url: parent.external_urls.spotify,
    };
  }

  if (isSpotifyPlaylist(parent)) {
    return {
      name: parent.name,
      thumbnail: parent.images[0]?.url ?? null,
      type: SongSource.SpotifyPlaylist,
      url: parent.external_urls.spotify,
    };
  }

  return null;
}
