/* eslint-disable promise/prefer-await-to-callbacks */
import type { Buffer } from 'node:buffer';
import { PassThrough, Transform } from 'node:stream';
import prism, { type FFmpeg } from 'prism-media';
import { type Socket, socket } from 'zeromq';
import { sendErrorMessage } from '../utils/textChannel.js';
import type AudioFilters from './AudioFilters.js';

const { FFmpeg: FFmpegTranscoder } = prism;

export class AudioTransform extends Transform {
	public audioFilters: AudioFilters;

	public socket: Socket | null = null;

	public ffmpeg: FFmpeg;

	public outputStream: PassThrough;

	public constructor(filters: AudioFilters) {
		super();

		this.ffmpeg = new FFmpegTranscoder({
			args: [
				'-analyzeduration',
				'0',
				'-loglevel',
				'16',
				'-f',
				`s16le`,
				'-ar',
				'48000',
				'-ac',
				'2',
				'-af',
				// eslint-disable-next-line no-useless-escape
				`${filters.DynamicFilters.join(',')},azmq=bind_address=tcp\\\\://127.0.0.1\\\\:5555${
					filters.hasFilter ? ',' : ''
				}${filters.filters()},volume=1.5`,
			],
		});

		console.log({
			dynamic: filters.DynamicFilters.join(','),
			filters: filters.filters(),
			full: `${filters.DynamicFilters.join(',')},azmq=bind_address=tcp\\\\://127.0.0.1\\\\:5555,${filters.filters()}`,
		});

		this.audioFilters = filters;

		this.outputStream = new PassThrough();

		this.handleFFmpeg();
		this.connectSocket();

		this.on('close', this.onClose.bind(this));
	}

	public override _transform(
		chunk: Buffer,
		encoding: BufferEncoding,
		callback: (error?: Error | null, data?: Buffer) => void,
	) {
		this.ffmpeg.process.stdin?.write(chunk, encoding);
		callback();
	}

	public setFilters(filters: AudioFilters) {
		this.audioFilters = filters;

		console.log({
			updates: this.audioFilters.socketUpdates(),
		});

		for (const update of this.audioFilters.socketUpdates()) {
			this.socket?.send(update, undefined, (err) => err && console.log(err));
		}
	}

	private connectSocket() {
		this.socket = socket('req');
		// eslint-disable-next-line n/no-sync
		this.socket.connect('tcp://127.0.0.1:5555');
	}

	private handleFFmpeg() {
		this.ffmpeg.on('error', this.onErr.bind(this));
		this.ffmpeg.process.stderr?.on('data', this.onErr.bind(this));
		this.ffmpeg.process.stdout?.pipe(this.outputStream, { end: false });
	}

	private onErr(data: Buffer) {
		void sendErrorMessage(new Error(data.toString()));
		console.error(data.toString());
	}

	private onClose() {
		this.socket?.close();
		this.ffmpeg.destroy();
	}
}
