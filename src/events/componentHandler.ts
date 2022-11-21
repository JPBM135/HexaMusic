import type { Interaction, Collection } from 'discord.js';
import { container } from 'tsyringe';
import { MusicQueue } from '../structures/Queue.js';
import { kQueues } from '../tokens.js';

type Buttons =
	| 'autoplay'
	| 'clear_effects'
	| 'clear'
	| 'leave'
	| 'pause'
	| 'repeat'
	| 'reverse'
	| 'show'
	| 'shuffle'
	| 'skip';

export const ComponentHandlerEvent = {
	name: 'interactionCreate',
	async execute(interaction: Interaction) {
		if (!interaction.isMessageComponent() || !interaction.inCachedGuild()) return;

		const { customId } = interaction;

		const command = customId.split(':')[1] as Buttons;

		const queues = container.resolve<Collection<string, MusicQueue>>(kQueues);

		const queue = queues.ensure(interaction.guildId!, () => {
			const voice = interaction.member?.voice.channel;
			return new MusicQueue(interaction.guild, voice!);
		});

		if (interaction.isSelectMenu()) {
			await queue.setEffects(interaction);
			return;
		}

		switch (command) {
			case 'autoplay':
				await queue.autoplay(interaction);
				break;
			case 'clear_effects':
				await queue.clearEffects(interaction);
				break;
			case 'clear':
				await queue.clear(interaction);
				break;
			case 'leave':
				await queue.leave(interaction);
				break;
			case 'pause':
				await queue.pause(interaction);
				break;
			case 'repeat':
				await queue.loop(interaction);
				break;
			case 'reverse':
				await queue.reverse(interaction);
				break;
			case 'show':
				await queue.sendQueueMessage(interaction);
				break;
			case 'shuffle':
				await queue.shuffle(interaction);
				break;
			case 'skip':
				await queue.skip(interaction);
				break;
			default:
				break;
		}
	},
};
