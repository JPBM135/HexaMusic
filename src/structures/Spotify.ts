import { setTimeout } from 'node:timers';
import { time, TimestampStyles, inlineCode } from 'discord.js';
import SpotifyNode from 'spotify-web-api-node';
import { Emojis, EnvironmentalVariables, SPOTIFY_REGEX } from '../constants.js';
import { validateStatusCode } from '../utils/bool.js';
import { resolveEnv } from '../utils/env.js';

type ArtistResponse = SpotifyApi.ArtistsTopTracksResponse & SpotifyApi.SingleArtistResponse;

interface SpotifyError {
	body: {
		error: {
			message: string;
			reason: string;
		};
	};
	headers: Record<string, string>;
	message: string;
	statusCode: number;
}

function catchFallback(error: SpotifyError): CatchFallbackResponse {
	return {
		body: `${error?.body?.error?.message ?? error?.message ?? 'Unknown error'} (${
			error?.body?.error?.reason ?? 'Unknown reason'
		})`,
		statusCode: error?.statusCode ?? 500,
		headers: error?.headers ?? {},
	};
}

interface CatchFallbackResponse {
	body: string;
	headers: Record<string, string>;
	statusCode: number;
}

function errorToCodeblock(error: CatchFallbackResponse) {
	return ` \`\`\`json\n${error.body}\n\`\`\``;
}

export default class SpotifyApi {
	public token: string | null;

	public expire: number | null;

	public expired: boolean;

	public rateLimit: {
		rateLimited: boolean;
		retryTimestamp: number | null;
	};

	public SpotifyClient: SpotifyNode;

	public constructor() {
		this.token = null;
		this.expire = null;
		this.expired = false;

		this.rateLimit = {
			rateLimited: false,
			retryTimestamp: null,
		};

		this.SpotifyClient = new SpotifyNode({
			clientId: resolveEnv(EnvironmentalVariables.SpotifyClientId),
			clientSecret: resolveEnv(EnvironmentalVariables.SpotifyClientSecret),
		});
	}

	private _backOff(statusCode: number, headers: Record<string, string>): this is CatchFallbackResponse {
		if (statusCode === 429) {
			this.rateLimit.rateLimited = true;
			this.rateLimit.retryTimestamp = Number(headers['retry-after']!) * 1_000 ?? null;

			setTimeout(() => {
				this.rateLimit.rateLimited = false;
				this.rateLimit.retryTimestamp = null;
			}, this.rateLimit.retryTimestamp);

			return false;
		}

		if (statusCode === 400) {
			this.expired = true;
			this.token = null;
			this.expire = null;
			return false;
		}

		return validateStatusCode(statusCode);
	}

	public rateLimited() {
		if (this.rateLimit.rateLimited) {
			throw new Error(
				`${Emojis.RedX} | Estamos sendo limitados pela API do Spotify, tente novamente em ${time(
					new Date(this.rateLimit.retryTimestamp! + Date.now()),
					TimestampStyles.RelativeTime,
				)}`,
			);
		}
	}

	public async getToken() {
		this.rateLimited();

		if (this.token && !this.expired) {
			return this.token;
		}

		if (this.token && this.expired) {
			const { body, statusCode, headers } = await this.SpotifyClient.refreshAccessToken().catch(catchFallback);

			if (this._backOff(statusCode, headers) && typeof body !== 'string') {
				this.token = body.access_token;
				this.SpotifyClient.setAccessToken(this.token);
				this.expired = false;

				this.expire = body.expires_in * 1_000;

				setTimeout(() => {
					this.expired = true;
				}, this.expire);

				return this.token;
			}
		}

		const { body, statusCode, headers } = await this.SpotifyClient.clientCredentialsGrant().catch(catchFallback);

		if (!this._backOff(statusCode, headers) || typeof body === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao obter o token da API do Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: body as string,
					statusCode,
					headers,
				})}`,
			);
		}

		this.token = body.access_token;
		this.expired = false;
		this.SpotifyClient.setAccessToken(this.token);

		this.expire = body.expires_in * 1_000;

		setTimeout(() => {
			this.expired = true;
		}, this.expire);

		return this.token;
	}

	public async searchTrack(query: string) {
		this.rateLimited();

		await this.getToken();

		const { body, statusCode, headers } = await this.SpotifyClient.searchTracks(query, {
			limit: 1,
		}).catch(catchFallback);

		if (!this._backOff(statusCode, headers) || typeof body === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao pesquisar a música no Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: body as string,
					statusCode,
					headers,
				})}`,
			);
		}

		if (!body.tracks?.items.length) {
			throw new Error(`${Emojis.RedX} | Não encontrei nenhuma música com o termo ${inlineCode(query)}`);
		}

		return body.tracks.items[0];
	}

	public async getTrack(url: string) {
		this.rateLimited();

		await this.getToken();

		const id = SPOTIFY_REGEX.track.exec(url)?.groups?.id;

		if (!id) {
			throw new Error(`${Emojis.RedX} | Link inválido, não consegui extrair o ID da música`);
		}

		const { body, statusCode, headers } = await this.SpotifyClient.getTrack(id).catch(catchFallback);

		if (!this._backOff(statusCode, headers) || typeof body === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao obter a música no Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: body as string,
					statusCode,
					headers,
				})}`,
			);
		}

		return body;
	}

	public async getPlaylist(url: string, full = true) {
		this.rateLimited();

		await this.getToken();

		const id = SPOTIFY_REGEX.playlist.exec(url)?.groups?.id;

		if (!id) {
			throw new Error(`${Emojis.RedX} | Link inválido, não consegui extrair o ID da playlist`);
		}

		const { body, statusCode, headers } = await this.SpotifyClient.getPlaylist(id).catch(catchFallback);

		if (!this._backOff(statusCode, headers) || typeof body === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao obter a playlist no Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: body as string,
					statusCode,
					headers,
				})}`,
			);
		}

		if (!full) {
			return body;
		}

		if (body.tracks.total > body.tracks.items.length) {
			while (body.tracks.items.length < body.tracks.total) {
				const { body: offsetBody, statusCode: offsetStatusCode } = await this.SpotifyClient.getPlaylistTracks(id, {
					offset: body.tracks.items.length,
				});

				if (!validateStatusCode(offsetStatusCode)) {
					continue;
				}

				body.tracks.items = body.tracks.items.concat(offsetBody.items);
			}
		}

		return body;
	}

	public async getAlbum(url: string, full = true) {
		this.rateLimited();

		await this.getToken();

		const id = SPOTIFY_REGEX.album.exec(url)?.groups?.id;

		if (!id) {
			throw new Error(`${Emojis.RedX} | Link inválido, não consegui extrair o ID do álbum`);
		}

		const { body, statusCode, headers } = await this.SpotifyClient.getAlbum(id).catch(catchFallback);

		if (!this._backOff(statusCode, headers) || typeof body === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao obter o álbum no Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: body as string,
					statusCode,
					headers,
				})}`,
			);
		}

		if (!full) {
			return body;
		}

		if (body.tracks.total > body.tracks.items.length) {
			while (body.tracks.items.length < body.tracks.total) {
				const { body: offsetBody, statusCode: offsetStatusCode } = await this.SpotifyClient.getAlbumTracks(id, {
					offset: body.tracks.items.length,
				});

				if (!validateStatusCode(offsetStatusCode)) {
					continue;
				}

				body.tracks.items = body.tracks.items.concat(offsetBody.items);
			}
		}

		return body;
	}

	public async getArtist(url: string, withTracks?: true): Promise<ArtistResponse>;
	public async getArtist(url: string, withTracks: false): Promise<SpotifyApi.SingleArtistResponse>;
	public async getArtist(url: string, withTracks = true): Promise<ArtistResponse | SpotifyApi.SingleArtistResponse> {
		this.rateLimited();

		await this.getToken();

		const id = SPOTIFY_REGEX.artist.exec(url)?.groups?.id;

		if (!id) {
			throw new Error(`${Emojis.RedX} | Link inválido, não consegui extrair o ID do artista`);
		}

		const { body, statusCode, headers } = await this.SpotifyClient.getArtist(id).catch(catchFallback);

		if (!this._backOff(statusCode, headers) || typeof body === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao obter o artista no Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: body as string,
					statusCode,
					headers,
				})}`,
			);
		}

		if (!withTracks) {
			return body;
		}

		const {
			body: tracksBody,
			statusCode: tracksStatusCode,
			headers: tracksHeaders,
		} = await this.SpotifyClient.getArtistTopTracks(id, 'BR').catch(catchFallback);

		if (!this._backOff(tracksStatusCode, tracksHeaders) || typeof tracksBody === 'string') {
			throw new Error(
				`${Emojis.RedX} | Falha ao obter as musicas mais ouvidas do artista no Spotify, a API retornou ${inlineCode(
					String(statusCode),
				)}${errorToCodeblock({
					body: tracksBody as string,
					statusCode,
					headers,
				})}`,
			);
		}

		return {
			...body,
			tracks: tracksBody.tracks,
		};
	}

	public get expireTimestamp() {
		if (!this.expire) {
			return null;
		}

		return this.expire + Date.now();
	}

	public get isRateLimited() {
		return this.rateLimit.rateLimited;
	}
}

const spot = new SpotifyApi();

console.log(await spot.getToken(), spot);
