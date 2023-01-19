import { type AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import type { GuildMember } from 'discord.js';
import { codeBlock } from 'discord.js';
// @ts-expect-error: Missing types
import YtSr from 'youtube-sr';
import type { Video } from '../../node_modules/youtube-sr/dist/mod.js';
import { YTDL_ARGS } from '../constants.js';
import type AudioFilters from './AudioFilters.js';
import type { MusicQueue } from './Queue.js';
import { StreamDownloader } from './StreamDowloader.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { searchOne } = YtSr as typeof import('../../node_modules/youtube-sr/dist/mod.js').default;

export interface MusicData {
	looped: boolean;
	playlist: {
		author: {
			icon: string | undefined;
			name: string;
			url: string;
		};
		id: string;
		image: string | undefined;
		title: string;
		url: string;
	} | null;
	source: VideoSource;
	spotify: (SpotifyApi.TrackObjectSimplified & { album: SpotifyApi.AlbumObjectSimplified }) | null;
	video: Video | null;
}

export enum VideoSource {
	Youtube,
	Spotify,
	AutoPlay,
}

export class Music {
	public _data: MusicData;

	public readonly requester: GuildMember;

	public readonly manager: MusicQueue;

	public stream: StreamDownloader | null;

	public resource: AudioResource | null;

	public startedAt: number | null;

	public constructor(data: MusicData, manager: MusicQueue, requester: GuildMember) {
		this._data = data;
		this.requester = requester;
		this.manager = manager;

		this.stream = null;
		this.resource = null;
		this.startedAt = null;
	}

	public get source() {
		return this._data.source;
	}

	public get looped() {
		return this._data.looped;
	}

	public set looped(value: boolean) {
		this._data.looped = value;
	}

	public get isPlaylist(): boolean {
		return Boolean(this._data.playlist);
	}

	public get isLoaded(): boolean {
		return Boolean(this._data.video);
	}

	public get isLive() {
		return this._data.video?.live ?? false;
	}

	public get name() {
		return this._data.spotify?.name ?? this._data.video?.title ?? 'Unknown';
	}

	public get originalUrl() {
		return this._data.spotify?.external_urls.spotify ?? this._data.video?.url ?? 'https://www.youtube.com/';
	}

	public get channel() {
		return this._data.spotify?.artists[0]?.name ?? this._data.video?.channel?.name ?? 'Unknown';
	}

	public get originalChannelUrl() {
		return (
			this._data.spotify?.artists[0]?.external_urls.spotify ??
			this._data.video?.channel?.url ??
			'https://www.youtube.com/'
		);
	}

	public get duration() {
		return this._data.video?.duration ?? this._data.spotify?.duration_ms ?? 0;
	}

	public get endDate() {
		if (!this.startedAt) {
			return new Date();
		}

		return new Date(this.startedAt + this.duration);
	}

	public get thumbnail() {
		return (
			(this._data.source === VideoSource.Spotify
				? this._data.spotify?.album?.images[0]?.url
				: this._data.video?.thumbnail?.url) ?? ''
		);
	}

	public async getResource(seek = 0): Promise<AudioResource<null>> {
		if (!this.isLoaded) {
			await this.getVideo();
		}

		if (this.stream) {
			this.stream.destroy();
			this.stream = null;
		}

		this.stream = new StreamDownloader(this._data.video!.url, this, {
			...YTDL_ARGS,
			fmt: 's16le',
			opusEncoded: true,
			seek,
		});

		this.stream.start(this.manager.audioEffects);

		this.startedAt ??= Date.now();

		this._streamListeners();

		this.resource = createAudioResource(this.stream.outputStream!, {
			inlineVolume: true,
			inputType: StreamType.Opus,
		});

		return this.resource as AudioResource<null>;
	}

	public changeFilter(filter: AudioFilters) {
		this.stream?.changeFilters(filter);
	}

	public async getVideo(): Promise<Video> {
		if (this.isLoaded) {
			return this._data.video!;
		}

		const query = `${this._data.spotify?.name} de ${this._data.spotify?.artists[0]?.name ?? ''}`.trim();

		const video = await searchOne(query, 'video', false).catch((error) => (error as Error).message);

		if (typeof video === 'string') {
			throw new RangeError(
				`Não foi possível encontrar o vídeo correspondenta a musica do Spotify, \`${query}\`\n${codeBlock(
					'js',
					video,
				)}`,
			);
		}

		this._data.video = video;

		return video;
	}

	private _streamListeners() {
		this.stream!.outputStream!.on('error', () => {
			this.stream!.destroy();
			this.stream = null;
		});

		/* 		this.stream!.on('data', () => {
			console.log('data received');
		}); */
	}
}
