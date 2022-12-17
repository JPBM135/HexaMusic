import { setTimeout, clearTimeout } from 'node:timers';
import {
	type VoiceConnection,
	type AudioPlayer,
	joinVoiceChannel,
	VoiceConnectionStatus,
	createAudioPlayer,
	NoSubscriberBehavior,
	AudioPlayerStatus,
} from '@discordjs/voice';
import {
	type Guild,
	type VoiceBasedChannel,
	type GuildMember,
	type ButtonInteraction,
	type SelectMenuInteraction,
	type Collection,
	channelMention,
	ChannelType,
	hyperlink,
	inlineCode,
	userMention,
} from 'discord.js';
import { container } from 'tsyringe';
// @ts-expect-error: Missing types
import YtSr from 'youtube-sr';
import ytdl from 'ytdl-core';
import { Emojis, EMPTY_CHANNEL_TIMEOUT, EMPTY_QUEUE_TIMEOUT } from '../constants.js';
import { editQueueMessage } from '../message/base.js';
import { kQueues, kSpotify } from '../tokens.js';
import { conditionalArrayReverse } from '../utils/array.js';
import { formatDate } from '../utils/date.js';
import { promisifyEnterState } from '../utils/enterState.js';
import { formatPlaylistMessage } from '../utils/formatters.js';
import { clearQuery, findFlags, findQueryMode } from '../utils/query.js';
import { EmbedType, sendErrorMessage, sendInteraction, sendMessage } from '../utils/textChannel.js';
import AudioFilters, { type AudioFilterTypes } from './AudioFilters.js';
import { Music, VideoSource } from './Songs.js';
import type SpotifyApi from './Spotify.js';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { getPlaylist, getVideo, searchOne } = YtSr as typeof import('../../node_modules/youtube-sr/dist/mod.js').default;

interface Timeouts {
	emptyChannel: NodeJS.Timeout | null;
	noSongs: NodeJS.Timeout | null;
	paused: NodeJS.Timeout | null;
	skip: NodeJS.Timeout | null;
}

interface QueueStates {
	autoplay: boolean;
	paused: boolean;
	repeat: RepeatModes;
	skipping: boolean;
}

export enum RepeatModes {
	Off,
	Music,
	Queue,
}

export enum QueryMode {
	Search,
	YoutubePlaylist,
	SpotifyPlaylist,
	YoutubeVideo,
	SpotifyTrack,
	SpotifyAlbum,
	SpotifyArtist,
}

export class MusicQueue {
	public queue: Music[];

	public guild: Guild;

	public voiceChannel: VoiceBasedChannel;

	public audioEffects: AudioFilters;

	public nowPlaying: Music | null;

	public timeouts: Timeouts;

	public volume: number;

	public connection: VoiceConnection | null;

	public player: AudioPlayer | null;

	public states: QueueStates;

	public pastVideos: Set<string>;

	public constructor(guild: Guild, voiceChannel: VoiceBasedChannel) {
		this.guild = guild;
		this.voiceChannel = voiceChannel;
		this.queue = [];
		this.pastVideos = new Set();

		this.nowPlaying = null;
		this.audioEffects = new AudioFilters();

		this.volume = 100;

		this.connection = null;
		this.player = null;

		this.states = {
			paused: false,
			repeat: RepeatModes.Off,
			autoplay: false,
			skipping: false,
		};

		this.timeouts = {
			emptyChannel: null,
			noSongs: null,
			paused: null,
			skip: null,
		};
	}

	public isPlaying(): this is { nowPlaying: Music } {
		return Boolean(this.nowPlaying);
	}

	public isConnected(): this is { connection: VoiceConnection } {
		return Boolean(this.connection);
	}

	public get formattedVolume() {
		return `${this.volume}%`;
	}

	public get durationFormatted() {
		const duration = this.queue.reduce((acc, cur) => acc + cur.duration, 0);
		return formatDate(duration);
	}

	public formattedNowPlaying(music = this.nowPlaying) {
		return hyperlink(
			inlineCode(music?.name ?? 'Nada tocando'),
			music?.originalUrl ?? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley',
		);
	}

	private get nowPlayingResource() {
		return this.nowPlaying?.resource ?? null;
	}

	public async connect() {
		if (!this.voiceChannel.joinable) {
			return sendMessage(`${Emojis.RedX} | Eu não tenho permissão para entrar nesse canal de voz!`, EmbedType.Error);
		}

		this.connection = joinVoiceChannel({
			adapterCreator: this.guild.voiceAdapterCreator,
			channelId: this.voiceChannel.id,
			guildId: this.guild.id,
			debug: true,
			selfDeaf: true,
			selfMute: false,
		});

		this.connectionListeners();

		if (!(await promisifyEnterState(this.connection, VoiceConnectionStatus.Ready, 10_000))) {
			this.destroy();
			return sendMessage(`${Emojis.RedX} | Não foi possível conectar ao canal de voz!`, EmbedType.Error);
		}

		if (this.voiceChannel.type === ChannelType.GuildStageVoice && !this.guild.members.me?.voice.suppress) {
			await this.guild.members.me?.voice.setSuppressed(false);
		}

		this.player = createAudioPlayer({
			behaviors: {
				noSubscriber: NoSubscriberBehavior.Pause,
			},
			debug: true,
		});

		this.playerListeners();

		this.connection.subscribe(this.player);

		return sendMessage(`${Emojis.Join} | Conectado ao canal de voz ${channelMention(this.voiceChannel.id)}!`);
	}

	public async query(queryString: string, requester: GuildMember) {
		if (!this.connection) {
			return void sendMessage(`${Emojis.RedX} | Não há uma conexão de voz ativa!`, EmbedType.Error);
		}

		if (queryString.length === 0) {
			return void sendMessage(`${Emojis.RedX} | Você precisa especificar uma música para pesquisar!`, EmbedType.Error);
		}

		const next = findFlags(queryString, ['next', 'proxima']);
		const inverse = findFlags(queryString, ['inverse', 'inversa']);

		const cleanQuery = clearQuery(queryString);

		const queryType = findQueryMode(queryString.trim());
		let found = false;

		switch (queryType) {
			case QueryMode.YoutubeVideo:
				found = await this.resolveYoutubeVideo(cleanQuery, requester, next);
				break;
			case QueryMode.YoutubePlaylist:
				found = await this.resolveYoutubePlaylist(cleanQuery, requester, inverse);
				break;
			case QueryMode.SpotifyTrack:
				found = await this.resolveSpotifyTrack(cleanQuery, requester, next);
				break;
			case QueryMode.SpotifyAlbum:
				found = await this.resolveSpotifyAlbum(cleanQuery, requester, inverse);
				break;
			case QueryMode.SpotifyArtist:
				found = await this.resolveSpotifyArtist(cleanQuery, requester, inverse);
				break;
			case QueryMode.SpotifyPlaylist:
				found = await this.resolveSpotifyPlaylist(cleanQuery, requester, inverse);
				break;
			case QueryMode.Search:
				found = await this.resolveSearch(cleanQuery, requester, next);
				break;
			default:
				void sendMessage(
					`${Emojis.RedX} | Não foi possível encontrar nenhum resultado para a sua pesquisa!`,
					EmbedType.Error,
				);
				break;
		}

		if (!found) return;

		void this.checkQueue();

		return void editQueueMessage();
	}

	public async checkQueue(): Promise<void> {
		if (this.nowPlaying) return;

		if (this.queue.length === 0) {
			this.nowPlaying = null;
			this.timeouts.noSongs = setTimeout(() => {
				this.destroy();
				void sendMessage(`${Emojis.Leave} | Fila vazia por muito tempo, saindo do canal de voz!`);
			}, EMPTY_QUEUE_TIMEOUT);
			void editQueueMessage();
			return;
		}

		if (this.voiceChannel.members.size === 1) {
			this.nowPlaying = null;
			this.timeouts.emptyChannel = setTimeout(() => {
				this.destroy();
				void sendMessage(`${Emojis.Leave} | Canal de voz vazio por muito tempo, saindo do canal de voz!`);
			}, EMPTY_CHANNEL_TIMEOUT);
		}

		this.clearQueueTimeouts();

		this.nowPlaying = this.queue.shift()!;
		const resource = await this.nowPlaying.getResource();

		if (!resource) {
			void sendMessage(`${Emojis.RedX} | Não foi possível tocar ${this.nowPlaying.name}!`, EmbedType.Error);
			return void this.checkQueue();
		}

		this.pastVideos.add(this.nowPlaying._data.video?.id ?? '');
		this.player?.play(resource);

		void sendMessage(
			`${Emojis.Play} | Tocando ${this.formattedNowPlaying()} pedido por ${userMention(this.nowPlaying.requester.id)}!`,
		);

		void editQueueMessage();

		if (this.queue.length > 0) {
			void this.queue[1]?.getVideo();
		}

		if (this.queue.length === 0 && this.states.autoplay) {
			void this.resolveAutoPlay();
		}
	}

	// #region Buttons

	public async skip(interaction: ButtonInteraction) {
		if (!this.nowPlaying) {
			return void sendInteraction(interaction, `${Emojis.RedX} | Não há nada tocando no momento!`, EmbedType.Error);
		}

		const oldPlaying = this.nowPlaying;
		this.states.skipping = true;
		this.skipTimeout();

		this.nowPlaying = null;
		void this.checkQueue();

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Skip} | Pulando ${this.formattedNowPlaying(oldPlaying)}!`);
	}

	public async pause(interaction: ButtonInteraction) {
		if (!this.nowPlaying) {
			return void sendInteraction(interaction, `${Emojis.RedX} | Não há nada tocando no momento!`, EmbedType.Error);
		}

		if (this.states.paused) {
			this.player?.unpause();
			this.states.paused = false;

			if (this.nowPlayingResource?.playStream.isPaused()) {
				this.nowPlayingResource?.playStream.resume();
			}

			if (this.timeouts.paused) {
				clearTimeout(this.timeouts.paused);
				this.timeouts.paused = null;
			}

			void editQueueMessage();
			return void sendInteraction(interaction, `${Emojis.Pause} | Resumindo ${this.formattedNowPlaying()}!`);
		}

		this.player?.pause();
		this.timeouts.paused = setTimeout(() => {
			this.destroy();
			void sendMessage(`${Emojis.Leave} | Música pausada por muito tempo, saindo do canal de voz!`);
		}, EMPTY_CHANNEL_TIMEOUT);

		if (!this.nowPlayingResource?.playStream.isPaused()) {
			this.nowPlayingResource?.playStream.pause();
		}

		this.states.paused = true;

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Pause} | Pausando ${this.formattedNowPlaying()}!`);
	}

	public async shuffle(interaction: ButtonInteraction) {
		if (this.queue.length === 0) {
			return void sendInteraction(
				interaction,
				`${Emojis.RedX} | Não há nada na fila para embaralhar!`,
				EmbedType.Error,
			);
		}

		this.queue = this.queue.sort(() => Math.random() - 0.5);

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Shuffle} | Fila embaralhada com sucesso!`);
	}

	public async reverse(interaction: ButtonInteraction) {
		if (this.queue.length === 0) {
			return void sendInteraction(interaction, `${Emojis.RedX} | Não há nada na fila para inverter!`, EmbedType.Error);
		}

		this.queue = this.queue.reverse();

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Loop} | Fila invertida com sucesso!`);
	}

	public async autoplay(interaction: ButtonInteraction) {
		if (this.states.autoplay) {
			this.states.autoplay = false;
			this.removeFromQueue('autoplay');

			void editQueueMessage();
			return void sendInteraction(interaction, `${Emojis.RedX} | Autoplay desativado!`);
		}

		this.states.autoplay = true;

		void this.resolveAutoPlay();

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Stream} | Autoplay ativado!`);
	}

	public async loop(interaction: ButtonInteraction) {
		if (this.states.repeat === RepeatModes.Off) {
			this.states.repeat = RepeatModes.Music;

			void editQueueMessage();
			return void sendInteraction(interaction, `${Emojis.RepeatOne} | Repetindo música!`);
		}

		if (this.states.repeat === RepeatModes.Music) {
			this.states.repeat = RepeatModes.Queue;

			void editQueueMessage();
			return void sendInteraction(interaction, `${Emojis.Repeat} | Repetindo fila!`);
		}

		this.states.repeat = RepeatModes.Off;
		this.removeFromQueue('looped');

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.RedX} | Repetição desativada!`);
	}

	public async setVolume(volume: number) {
		if (volume < 0 || volume > 100) {
			return void sendMessage(`${Emojis.RedX} | O volume deve estar entre 0 e 100!`, EmbedType.Error);
		}

		this.nowPlaying?.resource?.volume?.setVolume(volume / 100);

		void editQueueMessage();
		return void sendMessage(`${Emojis.Music} | Volume definido para ${volume}%!`);
	}

	public async sendQueueMessage(interaction: ButtonInteraction) {
		return void sendInteraction(interaction, `${Emojis.RedX} | Não implementado!`, EmbedType.Error);
	}

	public async clear(interaction: ButtonInteraction) {
		this.queue = [];

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Delete} | Fila limpa com sucesso!`);
	}

	public async leave(interaction: ButtonInteraction) {
		this.destroy();
		return void sendInteraction(interaction, `${Emojis.Leave} | Música parada com sucesso!`);
	}

	public async clearEffects(interaction: ButtonInteraction) {
		this.audioEffects.reset();

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Delete} | Efeitos removidos com sucesso!`);
	}

	public async setEffects(interaction: SelectMenuInteraction) {
		const effects = interaction.values;

		this.audioEffects.reset();
		for (const efc of effects) this.audioEffects.addFilter(efc! as AudioFilterTypes);

		if (this.isPlaying()) {
			this.nowPlaying.changeFilter(this.audioEffects);
		}

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Music} | Efeitos definidos com sucesso!`);
	}

	// #endregion

	private clearQueueTimeouts() {
		for (const [key, timeout] of Object.entries(this.timeouts) as [keyof Timeouts, NodeJS.Timeout][]) {
			clearTimeout(timeout);
			this.timeouts[key] = null;
		}
	}

	// #region Resolve

	private async resolveSpotifyPlaylist(query: string, requester: GuildMember, inverse: boolean) {
		try {
			const SpotifyApi = container.resolve<SpotifyApi>(kSpotify);

			const playlist = await SpotifyApi.getPlaylist(query, true);

			const musics = playlist.tracks.items.map(
				(item) =>
					new Music(
						{
							looped: false,
							playlist: {
								author: {
									icon: playlist.owner.images?.at(0)?.url,
									name: playlist.owner.display_name ?? playlist.name,
									url: playlist.owner.external_urls.spotify,
								},
								id: playlist.id,
								image: playlist.images?.at(0)?.url,
								title: playlist.name,
								url: playlist.external_urls.spotify,
							},
							source: VideoSource.Spotify,
							spotify: item.track,
							video: null,
						},
						this,
						requester,
					),
			);

			this.queue.push(...conditionalArrayReverse(musics, inverse));

			await sendMessage(
				formatPlaylistMessage({
					channelName: playlist.owner.display_name ?? playlist.name,
					playlistName: playlist.name,
					playlistUrl: playlist.external_urls.spotify,
					channelUrl: playlist.owner.external_urls.spotify,
					duration: musics.reduce((acc, cur) => acc + cur.duration, 0),
					inverse,
					trackCount: musics.length,
				}),
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveSpotifyAlbum(query: string, requester: GuildMember, inverse: boolean) {
		try {
			const SpotifyApi = container.resolve<SpotifyApi>(kSpotify);

			const album = await SpotifyApi.getAlbum(query, true);

			const musics = album.tracks.items.map(
				(item) =>
					new Music(
						{
							looped: false,
							playlist: {
								author: {
									icon: album.images?.at(0)?.url,
									name: album.artists.map((artist) => artist.name).join(', '),
									url: album.external_urls.spotify,
								},
								id: album.id,
								image: album.images?.at(0)?.url,
								title: album.name,
								url: album.external_urls.spotify,
							},
							source: VideoSource.Spotify,
							spotify: {
								...item,
								album,
							},
							video: null,
						},
						this,
						requester,
					),
			);

			this.queue.push(...conditionalArrayReverse(musics, inverse));

			await sendMessage(
				formatPlaylistMessage({
					channelName: album.artists.map((artist) => artist.name).join(', '),
					playlistName: album.name,
					playlistUrl: album.external_urls.spotify,
					channelUrl: album.artists.at(0)!.external_urls.spotify,
					duration: musics.reduce((acc, cur) => acc + cur.duration, 0),
					inverse,
					trackCount: musics.length,
				}),
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveSpotifyArtist(query: string, requester: GuildMember, inverse: boolean) {
		try {
			const SpotifyApi = container.resolve<SpotifyApi>(kSpotify);

			const artist = await SpotifyApi.getArtist(query, true);

			const musics = artist.tracks.map(
				(item) =>
					new Music(
						{
							looped: false,
							playlist: {
								author: {
									icon: artist.images?.at(0)?.url,
									name: artist.name,
									url: artist.external_urls.spotify,
								},
								id: artist.id,
								image: artist.images?.at(0)?.url,
								title: `Músicas mais populares do ${artist.name}`,
								url: artist.external_urls.spotify,
							},
							source: VideoSource.Spotify,
							spotify: {
								...item,
								artists: [artist],
							},
							video: null,
						},
						this,
						requester,
					),
			);

			this.queue.push(...conditionalArrayReverse(musics, inverse));

			await sendMessage(
				formatPlaylistMessage({
					channelName: artist.name,
					playlistName: artist.name,
					playlistUrl: artist.external_urls.spotify,
					channelUrl: artist.external_urls.spotify,
					duration: musics.reduce((acc, cur) => acc + cur.duration, 0),
					inverse,
					trackCount: musics.length,
				}),
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveSpotifyTrack(query: string, requester: GuildMember, next: boolean) {
		try {
			const SpotifyApi = container.resolve<SpotifyApi>(kSpotify);

			const track = await SpotifyApi.getTrack(query);

			const music = new Music(
				{
					looped: false,
					playlist: null,
					source: VideoSource.Spotify,
					spotify: track,
					video: null,
				},
				this,
				requester,
			);

			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			next ? this.queue.unshift(music) : this.queue.push(music);

			await sendMessage(
				`${Emojis.Track} | Música ${hyperlink(inlineCode(track.name), track.external_urls.spotify)} de ${hyperlink(
					inlineCode(track.artists.map((artist) => artist.name).join(', ')),
					track.artists.at(0)?.external_urls.spotify ?? track.external_urls.spotify,
				)} adicionada${next ? ' como próxima' : ''}!`,
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveYoutubePlaylist(query: string, requester: GuildMember, inverse: boolean) {
		try {
			const playlist = await getPlaylist(query, {
				fetchAll: true,
			});

			if (!playlist ?? !playlist.videos.length) {
				void sendMessage(`${Emojis.RedX} | Não foi possível encontrar a playlist informada!`, EmbedType.Error);
				return false;
			}

			const musics = playlist.videos.map(
				(item) =>
					new Music(
						{
							looped: false,
							playlist: {
								author: {
									icon: playlist.channel?.iconURL?.(),
									name: playlist.channel?.name ?? 'Desconhecido',
									url: playlist.channel?.url ?? 'https://youtube.com',
								},
								id: playlist.id!,
								image: playlist.thumbnail?.displayThumbnailURL(),
								title: playlist.title!,
								url: playlist.url!,
							},
							spotify: null,
							source: VideoSource.Youtube,
							video: item,
						},
						this,
						requester,
					),
			);

			this.queue.push(...conditionalArrayReverse(musics, inverse));

			await sendMessage(
				formatPlaylistMessage({
					channelName: playlist.channel?.name ?? 'Desconhecido',
					playlistName: playlist.title!,
					playlistUrl: playlist.url!,
					channelUrl: playlist.channel?.url ?? 'https://youtube.com',
					duration: musics.reduce((acc, cur) => acc + cur.duration, 0),
					inverse,
					trackCount: musics.length,
				}),
			);
			return true;
		} catch (error) {
			void sendErrorMessage(error as Error);
			return false;
		}
	}

	private async resolveYoutubeVideo(query: string, requester: GuildMember, next: boolean) {
		try {
			const video = await getVideo(query);

			if (!video) {
				void sendMessage(`${Emojis.RedX} | Não foi possível encontrar o video informado!`, EmbedType.Error);
				return false;
			}

			const music = new Music(
				{
					looped: false,
					playlist: null,
					spotify: null,
					source: VideoSource.Youtube,
					video,
				},
				this,
				requester,
			);

			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			next ? this.queue.unshift(music) : this.queue.push(music);

			const { isLive } = music;

			await sendMessage(
				`${Emojis[isLive ? 'Live' : 'Track']} | ${isLive ? 'Livestream' : 'Vídeo'} ${hyperlink(
					inlineCode(video.title ?? 'Nenhum titúlo'),
					video.url,
				)} de ${hyperlink(
					inlineCode(video.channel?.name ?? 'Desconhecido'),
					video.channel?.url ?? 'https://youtube.com',
				)} adicionada${next ? ' como próxima' : ''}!`,
			);
			return true;
		} catch (error) {
			void sendErrorMessage(error as Error);
			return false;
		}
	}

	private async resolveSearch(query: string, requester: GuildMember, next: boolean) {
		try {
			const video = await searchOne(query, 'video', false);

			if (!video) {
				void sendMessage(`${Emojis.RedX} | Não foi possível encontrar o video informado!`, EmbedType.Error);
				return false;
			}

			const music = new Music(
				{
					looped: false,
					playlist: null,
					spotify: null,
					source: VideoSource.Youtube,
					video,
				},
				this,
				requester,
			);

			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			next ? this.queue.unshift(music) : this.queue.push(music);

			await sendMessage(
				`${Emojis.Track} | Vídeo ${hyperlink(inlineCode(video.title ?? 'Nenhum titúlo'), video.url)} de ${hyperlink(
					inlineCode(video.channel?.name ?? 'Desconhecido'),
					video.channel?.url ?? 'https://youtube.com',
				)} adicionado${next ? ' como próximo' : ''}!`,
			);
			return true;
		} catch (error) {
			void sendErrorMessage(error as Error);
			return false;
		}
	}

	public async resolveAutoPlay() {
		if (!this.nowPlaying) return;
		const suggestions = await ytdl.getInfo(this.nowPlaying._data.video!.url);
		console.log(suggestions.related_videos);

		const video = suggestions.related_videos.filter((vid) => !this.pastVideos.has(vid.id!)).at(0);

		if (!video) {
			void sendMessage(`${Emojis.RedX} | Não foi possível encontrar um vídeo relacionado!`, EmbedType.Error);
			return;
		}

		const autoplay = new Music(
			{
				looped: false,
				playlist: null,
				source: VideoSource.AutoPlay,
				spotify: null,
				video: await getVideo(`https://www.youtube.com/watch?v=${video.id}`),
			},
			this,
			this.guild.members.me!,
		);

		this.queue.push(autoplay);

		void editQueueMessage();
	}

	// #endregion

	public removeFromQueue(type: 'autoplay' | 'looped') {
		if (type === 'autoplay') {
			this.queue = this.queue.filter((item) => item.source !== VideoSource.AutoPlay);
		} else {
			this.queue = this.queue.filter((item) => !item.looped);
		}
	}

	public destroy() {
		if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
			this.connection.destroy();
			this.connection = null;
		}

		if (this.nowPlaying) {
			this.nowPlaying.resource?.playStream.destroy();
			this.nowPlaying = null;
		}

		this.queue = [];
		this.player = null;

		const queues = container.resolve<Collection<string, MusicQueue>>(kQueues);
		queues.delete(this.guild.id);

		void editQueueMessage();
	}

	private connectionListeners() {
		this.connection?.on('stateChange', (oldState, newState) => {
			console.log(`Connection transitioned from ${oldState.status} to ${newState.status}`);

			if (newState.status === VoiceConnectionStatus.Destroyed) {
				this.destroy();
			} else if (
				newState.status === VoiceConnectionStatus.Disconnected &&
				oldState.status !== VoiceConnectionStatus.Destroyed
			) {
				this.connection?.destroy();
			}
		});

		this.connection?.on('error', (error) => {
			console.error(error);
			void sendErrorMessage(error);
		});

		this.connection?.on('debug', (message) => {
			console.log(message);
		});
	}

	private playerListeners() {
		this.player?.on('stateChange', async (oldState, newState) => {
			console.log(`Player transitioned from ${oldState.status} to ${newState.status}`);
			if (newState.status === AudioPlayerStatus.Idle) {
				if (this.states.repeat === RepeatModes.Music) {
					const resource = await this.nowPlaying?.getResource();
					if (resource) {
						this.player?.play(resource);
					}
				} else if (this.states.repeat === RepeatModes.Queue && this.nowPlaying) {
					this.nowPlaying.looped = true;
					this.queue.push(this.nowPlaying);
				} else {
					this.nowPlaying = null;
					void this.checkQueue();
				}
			}
		});

		this.player?.on('error', (error) => {
			if (error.message.toLowerCase().includes('premature') && this.states.skipping) {
				console.error(error);
				return;
			}

			if (error.message.includes('410')) {
				void sendMessage(
					`${Emojis.RedX} | Estamos sendo limitados pelo YouTube, por segurança a rede e para impedir que percamos o acesso a plataforma, limparemos a fila!`,
					EmbedType.Error,
				);
				this.destroy();
				return;
			}

			console.error(error);
			void sendErrorMessage(error);
			this.nowPlaying = null;
			void this.checkQueue();
		});

		this.player?.on('debug', (message) => {
			console.log(message);
		});
	}

	private skipTimeout() {
		if (this.timeouts.skip) {
			clearTimeout(this.timeouts.skip);
		}

		setTimeout(() => {
			this.states.skipping = false;
		}, 2_000);
	}
}
