import type { Guild, MessageCreateOptions } from 'discord.js';
import type { GuildSongs, GuildsQueue } from '../../@types/db-schema.js';
import { generateComponents } from './generateComponents.js';
import { generateContent } from './generateContent.js';
import { generateEmbed } from './generateEmbed.js';

export async function generateQueueMessage(
  guild: Guild,
  queue: GuildsQueue | null,
  songs: GuildSongs[],
  locale: string,
): Promise<MessageCreateOptions> {
  return {
    content: await generateContent(guild, queue, songs, locale),
    embeds: await generateEmbed(guild, queue, songs, locale),
    components: generateComponents(),
    allowedMentions: { parse: [] },
  };
}
