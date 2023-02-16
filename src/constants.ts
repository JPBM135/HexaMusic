import type { GuildTextBasedChannel, Message } from 'discord.js';

/* eslint-disable unicorn/no-unsafe-regex */
export const YTDL_ARGS = {
	quality: 'highestaudio',
	highWaterMark: 1_048_576 * 64,
	dlChunkSize: 0,
};

export const SPOTIFY_REGEX = {
	track_no_query: /^https?:\/\/open\.spotify\.com\/track/,
	track: /^https?:\/\/(?:www.)?(?:open\.)?spotify.com\/track\/(?<id>[\dA-Za-z]{22})(?:.+)?$/,
	playlist_no_query: /^https?:\/\/open\.spotify\.com\/playlist/,
	playlist: /^https?:\/\/(?:www.)?(?:open\.)?spotify.com\/playlist\/(?<id>[\dA-Za-z]{22})(?:.+)?$/,
	album_no_query: /^https?:\/\/open\.spotify\.com\/album/,
	album: /^https?:\/\/(?:www.)?(?:open\.)?spotify.com\/album\/(?<id>[\dA-Za-z]{22})(?:.+)?$/,
	artist_no_query: /^https?:\/\/open\.spotify\.com\/artist/,
	artist: /^https?:\/\/(?:www.)?(?:open\.)?spotify.com\/artist\/(?<id>[\dA-Za-z]{22})(?:.+)?$/,
};

export const YOUTUBE_REGEX = {
	playlist: /^(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/)playlist\?list=(?:PL|UU|LL|RD|OL)[\w-]{16,41}$/,
	video:
		/^(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^\s&?]+(?!\S))\/)|(?:\S*v=|v\/)))[^\s&?]+$/,
};

export enum EnvironmentalVariables {
	Cookie = 'COOKIE',
	ErrorChannelId = 'ERROR_CHANNEL_ID',
	OwnerId = 'OWNER_ID',
	QueryChannelsId = 'QUERY_CHANNELS_ID',
	QueryMessagesId = 'QUERY_MESSAGES_ID',
	SpotifyClientId = 'SPOTIFY_CLIENT_ID',
	SpotifyClientSecret = 'SPOTIFY_CLIENT_SECRET',
	Token = 'DISCORD_TOKEN',
}

export enum Emojis {
	Delete = '<:icons_delete:1042952850306773122>',
	GreenTick = '<:icons_Correct:1043283096574890066>',
	Join = '<:icons_join:1043200234345480253>',
	Leave = '<:icons_leave:1042952079427239936>',
	Live = '<:icons_live:1045059779279732766>',
	Loop = '<:icons_loop:1042951088996888586>',
	Music = '<:icons_music:1042946184018415696>',
	OrangeConnection = '<:icons_idelping:1044612147969261579>',
	Pause = '<:icons_play:1042946188149796874>',
	Play = '<:icons_pause:1042946185683533895>',
	Playlist = '<:icons_createchannel:1043283098130989086>',
	Queue = '<:icons_queue:1042946189450027068>',
	RedX = '<:icons_Wrong:1042946194839715891>',
	Repeat = '<:icons_repeat:1042961340546945065>',
	RepeatOne = '<:icons_repeatonce:1042961342254039160>',
	Shuffle = '<:icons_shuffle:1042946191979192361>',
	Skip = '<:icons_skip:1042960410120294510>',
	Spotify = '<:icons_spotify:1042946193367498762>',
	Stream = '<:icons_stream:1042951577163538432>',
	Track = '<:icons_createsticker:1043283099389268019>',
	Youtube = '<:icons_youtube_color:1042950930594791424>',
}

export enum EmbedColors {
	NoMusic = 0x36393f,
	Youtube = 0xe62117,
	Spotify = 0x1db954,
	AutoPlay = 0x6441a5,
	Information = 0x2471a3,
	Success = 0x3dff3d,
	Warning = 0xffff3c,
	SoftError = 0xffab20,
	Error = 0xff3c3c,
	Log = 0x34495e,
}

export const EMPTY_CHANNEL_TIMEOUT = 5 * 60 * 1_000;
export const PAUSED_TIMEOUT = 20 * 60 * 1_000;
export const EMPTY_QUEUE_TIMEOUT = 10 * 60 * 1_000;

export const DELETE_MESSAGE_TIMEOUT = 7_000;

export type ChannelsMap = Map<
	string,
	{
		channel: GuildTextBasedChannel;
		message: Message;
	}
>;
