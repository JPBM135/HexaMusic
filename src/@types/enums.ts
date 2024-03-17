export enum QueueState {
  Empty = 'empty',
  Error = 'error',
  Paused = 'paused',
  Playing = 'playing',
}

export enum RepeatMode {
  All = 'all',
  Off = 'off',
  One = 'one',
}

export enum SongSource {
  Autoplay = 'autoplay',
  Local = 'local',
  SpotifyAlbum = 'spotify_album',
  SpotifyArtist = 'spotify_artist',
  SpotifyPlaylist = 'spotify_playlist',
  SpotifyTrack = 'spotify_track',
  YoutubeChannel = 'youtube_channel',
  YoutubeLivestream = 'youtube_livestream',
  YoutubePlaylist = 'youtube_playlist',
  YoutubeSearch = 'youtube_search',
  YoutubeVideo = 'youtube_video',
}

export enum SupportedLocales {
  EnUs = 'en-us',
  PtBr = 'pt-br',
}
