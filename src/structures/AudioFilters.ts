export const AudioFiltersArguments = {
	'8D': {
		args: 'apulsator=hz=0.09',
		dynamic: false,
		generator: null,
	},
	bassboost: {
		args: 'bass=g=0:f=110:w=0.3',
		dynamic: true,
		generator: (enable: boolean) => `Parsed_bass_0 g ${enable ? '15' : '0'}`,
	},
	chorus: {
		args: 'chorus=0.7:0.9:55:0.4:0.25:2',
		dynamic: false,
		generator: null,
	},
	chorus3d: {
		args: 'chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3',
		dynamic: false,
		generator: null,
	},
	earrape: {
		args: 'channelsplit;sidechaingate=level_in=64',
		dynamic: false,
		generator: null,
	},
	expander: {
		args: 'compand=attacks=0:points=-80/-169|-54/-80|-49.5/-64.6|-41.1/-41.1|-25.8/-15|-10.8/-4.5|0/0|20/8.3',
		dynamic: false,
		generator: null,
	},
	flanger: {
		args: 'flanger',
		dynamic: false,
		generator: null,
	},
	karaoke: {
		args: 'stereotools=mlev=1',
		dynamic: true,
		generator: (enable: boolean) => `Parsed_stereotools_0 mlev ${enable ? '0.03' : '0'}`,
	},
	mcompand: {
		args: 'mcompand',
		dynamic: false,
		generator: null,
	},
	mono: {
		args: 'pan=mono|c0=.5*c0+.5*c1',
		dynamic: false,
		generator: null,
	},
	normalizer: {
		args: 'dynaudnorm=g=301:m=1',
		dynamic: false,
		generator:
			null /* (enable: boolean) => `Parsed_dynaudnorm_0 g ${enable ? '101' : '0'}\\\\:m ${enable ? '10' : '1'}` */,
	},
	phaser: {
		args: 'aphaser=in_gain=0.4',
		dynamic: false,
		generator: null,
	},
	pulsator: {
		args: 'apulsator=hz=1',
		dynamic: false,
		generator: null,
	},
	surrounding: {
		args: 'surround',
		dynamic: false,
		generator: null,
	},
	treble: {
		args: 'treble=g=0',
		dynamic: true,
		generator: (enable: boolean) => `Parsed_treble_0 g ${enable ? '5' : '0'}`,
	},
	tremolo: {
		args: 'tremolo',
		dynamic: false,
		generator: null,
	},
	vibrato: {
		args: 'vibrato=f=6.5',
		dynamic: false,
		generator: null,
	},
};

export default class AudioFilters {
	public audioFilters: Map<keyof typeof AudioFiltersArguments, string>;

	public constructor() {
		this.audioFilters = new Map();
	}

	public get hasFilter() {
		return Boolean(this.audioFilters.size);
	}

	public filters() {
		return Array.from(this.audioFilters.entries())
			.filter(([key, _]) => !AudioFiltersArguments[key].dynamic)
			.map(([_, val]) => val);
	}

	public hasFilterType(filter: keyof typeof AudioFiltersArguments) {
		return this.audioFilters.has(filter);
	}

	public addFilter(filter: keyof typeof AudioFiltersArguments) {
		const filterSelected = AudioFiltersArguments[filter];

		this.audioFilters.set(filter, filterSelected.generator ? filterSelected.generator(true)! : filterSelected.args);

		return true;
	}

	public removeFilter(filter: keyof typeof AudioFiltersArguments) {
		this.audioFilters.delete(filter);

		return true;
	}

	public reset() {
		this.audioFilters = new Map();
		return true;
	}

	public socketUpdates() {
		return Array.from(this.audioFilters.entries())
			.filter(([key, _]) => AudioFiltersArguments[key].dynamic)
			.map(([_, val]) => val);
	}

	public get DynamicFilters() {
		return Object.entries(AudioFiltersArguments)
			.filter(([_, filter]) => filter.dynamic)
			.map(([key, filter]) => this.audioFilters.get(key as keyof typeof AudioFiltersArguments) ?? filter.args);
	}

	public get StaticFilters() {
		return Object.entries(AudioFiltersArguments)
			.filter(([key, filter]) => !filter.dynamic && this.audioFilters.has(key as keyof typeof AudioFiltersArguments))
			.map(([_, filter]) => filter.args);
	}
}
