import type { song_source } from '../../@types/db-schema.js';
import { Emojis } from '../../constants/emojis.js';

const EMOJIS_BY_SONG_SOURCE: Record<song_source, string> = {
  autoplay: Emojis.Stream,
  local: Emojis.CreateSticker,
  spotify_album: Emojis.Spotify,
  spotify_artist: Emojis.Spotify,
  spotify_playlist: Emojis.Spotify,
  spotify_track: Emojis.Spotify,
  youtube_channel: Emojis.YoutubeColor,
  youtube_livestream: Emojis.Live,
  youtube_playlist: Emojis.YoutubeColor,
  youtube_search: Emojis.YoutubeColor,
  youtube_video: Emojis.YoutubeColor,
};

export function findEmoji(source: song_source): string {
  return EMOJIS_BY_SONG_SOURCE[source] ?? ':grey_question:';
}
