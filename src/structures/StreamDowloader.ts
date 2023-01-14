import { PassThrough } from 'node:stream';
import type { Readable } from 'node:stream';
import prism, { type opus as Opus /* type FFmpeg */ } from 'prism-media';
import type { downloadOptions } from 'ytdl-core';
import ytdl from 'ytdl-core';
import { /* EnvironmentalVariables, */ YTDL_ARGS } from '../constants.js';
// import { resolveEnv } from '../utils/env.js';
import type AudioFilters from './AudioFilters.js';
import type { Music } from './Songs.js';
import { AudioTransform } from './Trancoder.js';

const { opus: OpusTranscoder /* FFmpeg: FFmpegTranscoder */ } = prism;

interface YTDLStreamOptions extends downloadOptions {
	encoderArgs?: string[];
	fmt?: string;
	opusEncoded?: boolean;
	seek?: number;
}

export class StreamDownloader {
	public url: string;

	public options: YTDLStreamOptions;

	public fmt: string;

	public seek: number;

	public baseStream: Readable | null;

	public outputStream: PassThrough;

	public transcoder: AudioTransform | null;

	public opus: Opus.Encoder | null;

	public manager: Music;

	public constructor(url: string, manager: Music, options: YTDLStreamOptions = {}) {
		this.url = url;
		this.options = options;
		this.fmt = options.fmt ?? 'bestaudio';
		this.seek = options.seek ?? 0;

		this.manager = manager;

		this.baseStream = null;
		this.outputStream = new PassThrough();

		this.transcoder = null;
		this.opus = null;
	}

	public createYTDLStream() {
		this.baseStream = ytdl(this.url, {
			...YTDL_ARGS,
			requestOptions: {
				headers: {
					// cookie: resolveEnv(EnvironmentalVariables.Cookie),
				},
			},
		});

		this.baseStream.on('error', this.onError.bind(this));

		return this.baseStream;
	}

	public createTranscoder(filters: AudioFilters) {
		this.transcoder = new AudioTransform(filters);

		return this.transcoder;
	}

	public createOpusEncoder() {
		this.opus = new OpusTranscoder.Encoder({
			rate: 48_000,
			channels: 2,
			frameSize: 960,
		});

		return this.opus;
	}

	public createPipeline() {
		// Pipe the base stream to the transcoder
		this.baseStream?.pipe(this.transcoder!);
		// Pipe the transcoder to the opus encoder
		this.transcoder?.outputStream.pipe(this.opus!);
		// Pipe the opus encoder to the output stream
		this.opus?.pipe(this.outputStream!);

		this._createListeners();

		return this.outputStream;
	}

	public changeFilters(filters: AudioFilters) {
		// Create a new transcoder with the new filters
		this.transcoder!.setFilters(filters);
	}

	public start(filters: AudioFilters) {
		this.createYTDLStream();
		this.createTranscoder(filters);
		this.createOpusEncoder();
		this.createPipeline();

		return this.outputStream!;
	}

	private onError(error?: Error) {
		this.destroy(error);
	}

	public destroy(error?: Error) {
		if (error) this.manager.manager.player?.emit('error', error);
		console.log('Destroying stream');

		this.baseStream?.destroy();
		this.outputStream?.destroy();
		this.transcoder?.destroy();
		this.opus?.destroy();
	}

	private _createListeners() {
		this.baseStream!.on('error', (error) => {
			this.onError(error);
			console.error('Base stream error', error);
		});
		this.transcoder!.on('error', (error) => {
			this.onError(error);
			console.error('Transcoder error', error);
		});
		this.opus!.on('error', (error) => {
			this.onError(error);
			console.error('Opus error', error);
		});
		this.outputStream?.on('error', (error) => {
			this.onError(error);
			console.error('Output stream error', error);
		});

		this.outputStream?.on('end', this.destroy.bind(this));

		// this.baseStream?.on('data', () => console.count('base-data'));
		// this.outputStream?.on('data', () => console.count('data'));
	}
}
