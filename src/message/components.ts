import { createButton, createMessageActionRow } from '@yuudachi/framework';
import {
	ButtonStyle,
	type APIButtonComponent,
	parseEmoji,
	type APIMessageComponentEmoji,
	ComponentType,
	type APISelectMenuOption,
	type APIStringSelectComponent,
} from 'discord.js';
import { Emojis } from '../constants.js';
import { AudioFiltersArguments } from '../structures/AudioFilters.js';
import { type MusicQueue, RepeatModes } from '../structures/Queue.js';

interface ButtonOptions {
	customId: string;
	disabled: boolean;
	emoji: string;
	label: string;
	style: ButtonStyle;
}

const ReadableAudioEffects: Record<keyof typeof AudioFiltersArguments, string> = {
	'8D': '8D',
	bassboost: 'Bassboost (Dinâmico)',
	chorus: 'Coro',
	chorus3d: 'Coro 3D',
	earrape: 'EarRape',
	expander: 'Expansor',
	flanger: 'Flanger',
	karaoke: 'Karaoke (Dinâmico)',
	mcompand: 'MCompand',
	mono: 'Mono Audio',
	normalizer: 'Normalizador',
	phaser: 'Fase',
	pulsator: 'Pulsador',
	surrounding: 'Surrounding',
	treble: 'Agudo (Dinâmico)',
	tremolo: 'Tremolo',
	vibrato: 'Vibrato',
};

function createButtonEmoji({ label, customId, emoji, style, disabled }: ButtonOptions): APIButtonComponent {
	return {
		...createButton({
			customId,
			label,
			style,
			disabled,
		}),
		emoji: parseEmoji(emoji) as APIMessageComponentEmoji,
	};
}

export function generatePadronizedComponents(disabled = true, manager?: MusicQueue) {
	const { states, audioEffects } = manager ?? { states: { paused: false, repeat: RepeatModes.Off, autoplay: false } };

	return [
		createMessageActionRow([
			createButtonEmoji({
				customId: 'queue:skip',
				disabled,
				emoji: Emojis.Skip,
				label: 'Pular',
				style: ButtonStyle.Primary,
			}),
			createButtonEmoji({
				customId: 'queue:pause',
				disabled,
				emoji: states.paused ? Emojis.Play : Emojis.Pause,
				label: states.paused ? 'Resumir' : 'Pausar',
				style: ButtonStyle.Primary,
			}),
			createButtonEmoji({
				customId: 'queue:shuffle',
				disabled,
				emoji: Emojis.Shuffle,
				label: 'Aleatorizar',
				style: ButtonStyle.Primary,
			}),
			createButtonEmoji({
				customId: 'queue:reverse',
				disabled,
				emoji: Emojis.Loop,
				label: 'Inverter',
				style: ButtonStyle.Primary,
			}),
			createButtonEmoji({
				customId: 'queue:autoplay',
				disabled,
				emoji: states.autoplay ? Emojis.Stream : Emojis.RedX,
				label: 'Autoplay',
				style: states.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary,
			}),
		]),
		createMessageActionRow([
			createButtonEmoji({
				customId: 'queue:repeat',
				disabled,
				emoji:
					states.repeat === RepeatModes.Off
						? Emojis.RedX
						: states.repeat === RepeatModes.Music
						? Emojis.RepeatOne
						: Emojis.Repeat,
				label: 'Repetir',
				style: states.repeat === RepeatModes.Off ? ButtonStyle.Secondary : ButtonStyle.Primary,
			}),
			createButtonEmoji({
				customId: 'queue:show',
				disabled,
				emoji: Emojis.Queue,
				label: 'Ver Fila',
				style: ButtonStyle.Primary,
			}),
			createButtonEmoji({
				customId: 'queue:clear',
				disabled,
				emoji: Emojis.Delete,
				label: 'Limpar Fila',
				style: ButtonStyle.Danger,
			}),
			createButtonEmoji({
				customId: 'queue:leave',
				disabled,
				emoji: Emojis.Leave,
				label: 'Sair',
				style: ButtonStyle.Danger,
			}),
			createButtonEmoji({
				customId: 'queue:clear_effects',
				disabled,
				emoji: Emojis.Delete,
				label: 'Limpar Efeitos',
				style: ButtonStyle.Secondary,
			}),
		]),
		createMessageActionRow([
			{
				custom_id: 'queue:effects',
				type: ComponentType.StringSelect,
				disabled,
				max_values: 2,
				options: Object.keys(AudioFiltersArguments).map(
					(effect) =>
						({
							label: ReadableAudioEffects[effect as keyof typeof AudioFiltersArguments],
							value: effect,
							default: audioEffects?.hasFilterType(effect as keyof typeof AudioFiltersArguments) ?? false,
							description: `Efeito de áudio ${ReadableAudioEffects[effect as keyof typeof AudioFiltersArguments]}`,
						} as APISelectMenuOption),
				),
				placeholder: 'Efeitos de Áudio',
			} as APIStringSelectComponent,
		]),
	];
}
