import type { Guilds, GuildsInput } from '../../@types/db-schema.js';
import { SupportedLocales } from '../../@types/enums.js';
import type { TypedOmit } from '../../@types/utils.js';
import { generateSnowflake } from '../../core/utils/generateSnowflake.js';
import { resolveToken } from '../../core/utils/tokens.js';
import { kSql } from '../../tokens.js';

export async function createGuild(input: TypedOmit<GuildsInput, 'id'>): Promise<Guilds> {
  const sql = resolveToken(kSql);

  const [guild] = await sql<Guilds>('guilds')
    .insert({
      id: generateSnowflake(),
      guild_id: input.guild_id,
      channel_id: input.channel_id ?? null,
      locale: input.locale ?? SupportedLocales.EnUs,
      message_id: input.message_id ?? null,
      restricted_role_id: input.restricted_role_id ?? null,
    })
    .returning('*');

  return guild!;
}
