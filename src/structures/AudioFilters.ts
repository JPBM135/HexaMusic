export enum AudioFilterTypes {
	'8D' = 'apulsator=hz=0.09',
	bassboost = 'bass=g=20:f=110:w=0.3',
	bassboost_high = 'bass=g=30:f=110:w=0.3',
	bassboost_low = 'bass=g=15:f=110:w=0.3',
	chorus = 'chorus=0.7:0.9:55:0.4:0.25:2',
	chorus3d = 'chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3',
	earrape = 'channelsplit;sidechaingate=level_in=64',
	expander = 'compand=attacks=0:points=-80/-169|-54/-80|-49.5/-64.6|-41.1/-41.1|-25.8/-15|-10.8/-4.5|0/0|20/8.3',
	fadein = 'afade=t=in:ss=0:d=10',
	flanger = 'flanger',
	gate = 'agate',
	haas = 'haas',
	karaoke = 'stereotools=mlev=0.03',
	mcompand = 'mcompand',
	mono = 'pan=mono|c0=.5*c0+.5*c1',
	mstlr = 'stereotools=mode=ms>lr',
	mstrr = 'stereotools=mode=ms>rr',
	nightcore = 'aresample=48000;asetrate=48000*1.25',
	normalizer = 'dynaudnorm=g=101',
	phaser = 'aphaser=in_gain=0.4',
	pulsator = 'apulsator=hz=1',
	surrounding = 'surround',
	treble = 'treble=g=5',
	tremolo = 'tremolo',
	vibrato = 'vibrato=f=6.5',
}

export default class AudioFilters {
	public audioFilters: AudioFilterTypes[];

	public constructor() {
		this.audioFilters = [];
	}

	public get hasFilter() {
		return this.audioFilters.length > 0;
	}

	public get filters() {
		return this.audioFilters.map((filter) => AudioFilterTypes[filter as keyof typeof AudioFilterTypes]).join(',');
	}

	public hasFilterType(filter: AudioFilterTypes) {
		return this.audioFilters.includes(filter);
	}

	public addFilter(filter: AudioFilterTypes) {
		if (!AudioFilterTypes[filter as keyof typeof AudioFilterTypes]) {
			throw new Error('errors:music.filter.invalid');
		}

		this.audioFilters.push(filter);

		return true;
	}

	public removeFilter(filter: AudioFilterTypes) {
		if (!AudioFilterTypes[filter as keyof typeof AudioFilterTypes]) {
			throw new Error('errors:music.filter.invalid');
		}

		this.audioFilters = this.audioFilters.filter((fil) => fil !== filter);

		return true;
	}

	public reset() {
		this.audioFilters = [];
		return true;
	}
}
