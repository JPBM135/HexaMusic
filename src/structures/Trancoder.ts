/* eslint-disable promise/prefer-await-to-callbacks */
import { Buffer } from 'node:buffer';
import ChildProcess from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { Duplex } from 'node:stream';

const FFMpegPath = (await import('ffmpeg-static').then((ffmpeg) => ffmpeg.default)) as string;

interface FFmpegOptions {
	args?: string[];
	shell?: boolean;
}

const FFMPEG = {
	command: null,
	output: null,
};

const VERSION_REGEX = /version (?<version>.+) copyright/im;

Object.defineProperty(FFMPEG, 'version', {
	get() {
		return VERSION_REGEX.exec(FFMPEG.output!)?.groups?.version ?? null;
	},
	enumerable: true,
});

export class MutableFFmpeg extends Duplex {
	public process: ChildProcess.ChildProcessWithoutNullStreams | null;

	public constructor(options: FFmpegOptions = {}) {
		super();
		this.process = MutableFFmpeg.create({ shell: false, ...options });
		const EVENTS = {
			readable: this._reader,
			data: this._reader,
			end: this._reader,
			unpipe: this._reader,
			finish: this._writer,
			drain: this._writer,
		};

		for (const method of ['on', 'once', 'removeListener', 'removeListeners', 'listeners']) {
			// @ts-expect-error: Ignore
			this[method] = (event: string, fn: (arg: any) => void) =>
				EVENTS[event as keyof typeof EVENTS]
					? // @ts-expect-error: Ignore
					  EVENTS[event as keyof typeof EVENTS][method as key](event, fn)
					: // @ts-expect-error: Ignore
					  Duplex.prototype[method as keyof typeof Duplex['prototype']].call(this, event, fn);
		}

		this._reader.on('error', this.emit.bind(this, 'error'));
		this._writer.on('error', this.emit.bind(this, 'error'));
	}

	public get _reader() {
		return this.process?.stdout as Readable;
	}

	public get _writer() {
		return this.process?.stdin as Writable;
	}

	public override write(
		chunk: any,
		encoding?: BufferEncoding | undefined,
		cb?: ((error: Error | null | undefined) => void) | undefined,
	): boolean;
	public override write(chunk: any, cb?: ((error: Error | null | undefined) => void) | undefined): boolean;
	public override write(
		chunk: unknown,
		encoding?: BufferEncoding | ((error: Error | null | undefined) => void),
		cb?: (error: Error | null | undefined) => void,
	): boolean {
		return this._writer.write(chunk, encoding as BufferEncoding, cb);
	}

	public override end(cb?: (() => void) | undefined): this;
	public override end(chunk: any, cb?: (() => void) | undefined): this;
	public override end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
	public override end(chunk?: unknown, encoding?: unknown, cb?: unknown): this {
		this._writer.end(chunk, encoding as BufferEncoding, cb as () => void);
		return this;
	}

	public override read(size?: number | undefined) {
		return this._reader.read(size);
	}

	public override setEncoding(encoding: BufferEncoding) {
		this._reader.setEncoding(encoding);
		return this;
	}

	public override pipe<T extends NodeJS.WritableStream>(
		destination: T,
		options?: { end?: boolean | undefined } | undefined,
	): T {
		this._reader.pipe(destination, options);
		return destination;
	}

	public override unpipe(destination?: NodeJS.WritableStream | undefined) {
		this._reader.unpipe(destination);
		return this;
	}

	// Update the process arguments
	public mutateProcess(args: FFmpegOptions) {
		const oldProcess = this.process;
		this.process = MutableFFmpeg.create(args);

		oldProcess?.kill();
	}

	public _copy(methods: string[], target: Readable | Writable) {
		for (const method of methods) {
			// @ts-expect-error: Ignore
			this[method] = target[method].bind(target);
		}
	}

	public override _destroy(err: Error, cb: (err: Error | null) => void) {
		this._cleanup();
		cb(err);
	}

	public override _final(cb: (err?: Error) => void) {
		this._cleanup();
		cb();
	}

	public _cleanup() {
		if (this.process) {
			this.once('error', () => {});
			this.process.kill('SIGKILL');
			this.process = null;
		}
	}

	public static getInfo(force = false) {
		if (FFMPEG.command && !force) return FFMPEG;

		try {
			// eslint-disable-next-line n/no-sync
			const result = ChildProcess.spawnSync(FFMpegPath, ['-h'], { windowsHide: true });
			console.log(result);
			if (result.error) throw result.error;
			Object.assign(FFMPEG, {
				command: FFMpegPath,
				output: Buffer.concat(result.output.filter(Boolean) as Buffer[]).toString(),
			});
			return FFMPEG;
		} catch (error) {
			console.error(error);
			// Do nothing
		}

		throw new Error('FFmpeg/avconv not found!');
	}

	public static create({ args = [], shell = false }: FFmpegOptions) {
		if (!args.includes('-i')) args.unshift('-i', '-');
		return ChildProcess.spawn(MutableFFmpeg.getInfo().command!, args.concat(['pipe:1']), {
			windowsHide: true,
			shell,
		});
	}
}
