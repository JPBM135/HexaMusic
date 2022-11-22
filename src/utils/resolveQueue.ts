import type { Collection } from 'discord.js';
import { container } from 'tsyringe';
import type { MusicQueue } from '../structures/Queue.js';
import { kQueues } from '../tokens.js';

export function resolveQueue(guildId: string): MusicQueue | undefined {
	return container.resolve<Collection<string, MusicQueue>>(kQueues).get(guildId);
}
