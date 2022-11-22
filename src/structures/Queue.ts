import { setTimeout, clearTimeout } from 'node:timers';
import {
	type VoiceConnection,
	type AudioPlayer,
	joinVoiceChannel,
	VoiceConnectionStatus,
	entersState,
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
import { Emojis, EMPTY_CHANNEL_TIMEOUT, EMPTY_QUEUE_TIMEOUT, SPOTIFY_REGEX, YOUTUBE_REGEX } from '../constants.js';
import { editQueueMessage } from '../message/base.js';
import { kQueues, kSpotify } from '../tokens.js';
import { formatDate } from '../utils/date.js';
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
}

interface QueueStates {
	autoplay: boolean;
	paused: boolean;
	repeat: RepeatModes;
	skipping: number | null;
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
			skipping: null,
		};

		this.timeouts = {
			emptyChannel: null,
			noSongs: null,
			paused: null,
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

	public formatedNowPlaying(music = this.nowPlaying) {
		return hyperlink(
			inlineCode(music?.name ?? 'Nada tocando'),
			music?.originalUrl ?? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley',
		);
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

		if (!(await this.promisifyEnterState(VoiceConnectionStatus.Ready, 10_000))) {
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

		const queryType = this.findQueryMode(queryString.trim());
		let found = false;

		switch (queryType) {
			case QueryMode.YoutubeVideo:
				found = await this.resolveYoutubeVideo(queryString, requester);
				break;
			case QueryMode.YoutubePlaylist:
				found = await this.resolveYoutubePlaylist(queryString, requester);
				break;
			case QueryMode.SpotifyTrack:
				found = await this.resolveSpotifyTrack(queryString, requester);
				break;
			case QueryMode.SpotifyAlbum:
				found = await this.resolveSpotifyAlbum(queryString, requester);
				break;
			case QueryMode.SpotifyArtist:
				found = await this.resolveSpotifyArtist(queryString, requester);
				break;
			case QueryMode.SpotifyPlaylist:
				found = await this.resolveSpotifyPlaylist(queryString, requester);
				break;
			case QueryMode.Search:
				found = await this.resolveSearch(queryString, requester);
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
			}, EMPTY_QUEUE_TIMEOUT);
			void editQueueMessage();
			return;
		}

		if (this.voiceChannel.members.size === 1) {
			this.nowPlaying = null;
			this.timeouts.emptyChannel = setTimeout(() => {
				this.destroy();
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
			`${Emojis.Play} | Tocando ${this.formatedNowPlaying()} pedido por ${userMention(this.nowPlaying.requester.id)}!`,
		);

		void editQueueMessage();

		if (this.queue.length > 0) {
			void this.queue[1]?.getVideo();
		}

		if (this.queue.length === 0 && this.states.autoplay) {
			void this.resolveAutoPlay();
		}
	}

	public async skip(interaction: ButtonInteraction) {
		if (!this.nowPlaying) {
			return void sendInteraction(interaction, `${Emojis.RedX} | Não há nada tocando no momento!`, EmbedType.Error);
		}

		const oldPlaying = this.nowPlaying;
		this.states.skipping = Date.now();

		this.nowPlaying = null;
		void this.checkQueue();

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Skip} | Pulando ${this.formatedNowPlaying(oldPlaying)}!`);
	}

	public async pause(interaction: ButtonInteraction) {
		if (!this.nowPlaying) {
			return void sendInteraction(interaction, `${Emojis.RedX} | Não há nada tocando no momento!`, EmbedType.Error);
		}

		if (this.states.paused) {
			this.player?.unpause();
			this.states.paused = false;

			void editQueueMessage();
			return void sendInteraction(interaction, `${Emojis.Pause} | Resumindo ${this.formatedNowPlaying()}!`);
		}

		this.player?.pause();
		this.states.paused = true;

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Pause} | Pausando ${this.formatedNowPlaying()}!`);
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
		const effects = interaction.values[0];

		this.audioEffects.reset();
		this.audioEffects.addFilter(effects! as AudioFilterTypes);

		if (this.isPlaying()) {
			this.nowPlaying.changeFilter(this.audioEffects);
		}

		void editQueueMessage();
		return void sendInteraction(interaction, `${Emojis.Music} | Efeitos definidos com sucesso!`);
	}

	private clearQueueTimeouts() {
		if (this.timeouts.noSongs) clearTimeout(this.timeouts.noSongs);
		if (this.timeouts.emptyChannel) clearTimeout(this.timeouts.emptyChannel);
		if (this.timeouts.paused) clearTimeout(this.timeouts.paused);

		this.timeouts.noSongs = null;
		this.timeouts.emptyChannel = null;
		this.timeouts.paused = null;
	}

	private findQueryMode(query: string) {
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

	private async resolveSpotifyPlaylist(query: string, requester: GuildMember) {
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

			this.queue.push(...musics);

			await sendMessage(
				[
					`${Emojis.Playlist} | ${inlineCode(
						String(playlist.tracks.total),
					)} músicas adicionadas da playlist ${hyperlink(
						inlineCode(playlist.name),
						playlist.external_urls.spotify,
					)} de ${hyperlink(inlineCode(playlist.owner.display_name!), playlist.owner.external_urls.spotify)}!`,
					`> Duração total: ${inlineCode(formatDate(musics.reduce((acc, cur) => acc + cur.duration, 0)))}`,
				].join('\n'),
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveSpotifyAlbum(query: string, requester: GuildMember) {
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

			this.queue.push(...musics);

			await sendMessage(
				[
					`${Emojis.Playlist} | ${inlineCode(String(album.tracks.total))} músicas adicionadas do álbum ${hyperlink(
						inlineCode(album.name),
						album.external_urls.spotify,
					)} de ${hyperlink(
						inlineCode(album.artists.map((artist) => artist.name).join(', ')),
						album.artists.at(0)?.external_urls.spotify ?? album.external_urls.spotify,
					)}!`,
					`> Duração total: ${inlineCode(formatDate(musics.reduce((acc, cur) => acc + cur.duration, 0)))}`,
				].join('\n'),
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveSpotifyArtist(query: string, requester: GuildMember) {
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

			this.queue.push(...musics);

			await sendMessage(
				[
					`${Emojis.Playlist} | ${inlineCode(
						String(artist.tracks.length),
					)} músicas adicionadas das top músicas de ${hyperlink(
						inlineCode(artist.name),
						artist.external_urls.spotify,
					)}!`,
					`> Duração total: ${inlineCode(formatDate(musics.reduce((acc, cur) => acc + cur.duration, 0)))}`,
				].join('\n'),
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveSpotifyTrack(query: string, requester: GuildMember) {
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

			this.queue.push(music);

			await sendMessage(
				`${Emojis.Track} | Música ${hyperlink(inlineCode(track.name), track.external_urls.spotify)} de ${hyperlink(
					inlineCode(track.artists.map((artist) => artist.name).join(', ')),
					track.artists.at(0)?.external_urls.spotify ?? track.external_urls.spotify,
				)} adicionada!`,
			);
			return true;
		} catch (error) {
			void sendMessage((error as Error).message, EmbedType.Error);
			return false;
		}
	}

	private async resolveYoutubePlaylist(query: string, requester: GuildMember) {
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
									icon: playlist.channel?.iconURL(),
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

			this.queue.push(...musics);

			await sendMessage(
				[
					`${Emojis.Playlist} | ${inlineCode(
						String(playlist.videos.length),
					)} músicas adicionadas da playlist ${hyperlink(inlineCode(playlist.title!), playlist.url!)}!`,
					`> Duração total: ${inlineCode(formatDate(musics.reduce((acc, cur) => acc + cur.duration, 0)))}`,
				].join('\n'),
			);
			return true;
		} catch (error) {
			void sendErrorMessage(error as Error);
			return false;
		}
	}

	private async resolveYoutubeVideo(query: string, requester: GuildMember) {
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

			this.queue.push(music);

			await sendMessage(
				`${Emojis.Track} | Música ${hyperlink(inlineCode(video.title ?? 'Nenhum titúlo'), video.url)} de ${hyperlink(
					inlineCode(video.channel?.name ?? 'Desconhecido'),
					video.channel?.url ?? 'https://youtube.com',
				)} adicionada!`,
			);
			return true;
		} catch (error) {
			void sendErrorMessage(error as Error);
			return false;
		}
	}

	private async resolveSearch(query: string, requester: GuildMember) {
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

			this.queue.push(music);

			await sendMessage(
				`${Emojis.Track} | Vídeo ${hyperlink(inlineCode(video.title ?? 'Nenhum titúlo'), video.url)} de ${hyperlink(
					inlineCode(video.channel?.name ?? 'Desconhecido'),
					video.channel?.url ?? 'https://youtube.com',
				)} adicionado!`,
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

	public removeFromQueue(type: 'autoplay' | 'looped') {
		if (type === 'autoplay') {
			this.queue = this.queue.filter((item) => item.source !== VideoSource.AutoPlay);
		} else {
			this.queue = this.queue.filter((item) => !item.looped);
		}
	}

	public destroy() {
		void editQueueMessage();

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
			if (error.message.includes('Premature close') && Date.now() - this.states.skipping! < 2_000) {
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

	private async promisifyEnterState(state: VoiceConnectionStatus, timeout: number): Promise<boolean> {
		try {
			await entersState(this.connection!, state, timeout);
			return true;
		} catch {
			return false;
		}
	}
}
