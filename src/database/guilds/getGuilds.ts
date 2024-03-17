import type { Guilds } from '../../@types/db-schema.js';
import { resolveToken } from '../../core/utils/tokens.js';
import { kSql } from '../../tokens.js';

export async function getGuildByGuildId(guildId: string): Promise<Guilds | null> {
  const sql = resolveToken(kSql);

  const guild = await sql.select('*').from<Guilds>('guilds').where('guild_id', guildId).first();

  return guild ?? null;
}
