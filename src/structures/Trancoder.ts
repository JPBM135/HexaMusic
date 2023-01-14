/* eslint-disable promise/prefer-await-to-callbacks */
import type { Buffer } from 'node:buffer';
import { PassThrough, Transform } from 'node:stream';
import prism, { type FFmpeg } from 'prism-media';
import { type Socket, socket } from 'zeromq';
import type AudioFilters from './AudioFilters.js';

const { FFmpeg: FFmpegTranscoder } = prism;

export class AudioTransform extends Transform {
	public audioFilters: AudioFilters;

	public socket: Socket;

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
				}${filters.filters()}`,
			],
		});

		console.log({
			dynamic: filters.DynamicFilters.join(','),
			filters: filters.filters(),
			full: `${filters.DynamicFilters.join(',')},azmq=bind_address=tcp\\\\://127.0.0.1\\\\:5555,${filters.filters()}`,
		});

		this.ffmpeg.on('error', (err) => console.log(err));
		this.ffmpeg.process.stderr?.on('data', (data) => console.log(data.toString()));
		// this.ffmpeg.process.stdout?.on('data', (data) => console.log(data.toString()));

		this.socket = socket('req');
		// eslint-disable-next-line n/no-sync
		this.socket.connect('tcp://127.0.0.1:5555');

		this.audioFilters = filters;

		this.outputStream = new PassThrough();

		this.ffmpeg.process.stdout?.pipe(this.outputStream);
	}

	public override _transform(
		chunk: Buffer,
		encoding: BufferEncoding,
		callback: (error?: Error | null, data?: Buffer) => void,
	) {
		console.log(chunk);
		this.ffmpeg.process.stdin?.write(chunk, encoding);
		callback();
	}

	public setFilters(filters: AudioFilters) {
		this.audioFilters = filters;

		console.log({
			updates: this.audioFilters.socketUpdates(),
		});

		for (const update of this.audioFilters.socketUpdates()) {
			this.socket.send(update, undefined, (err) => err && console.log(err));
		}
	}
}
