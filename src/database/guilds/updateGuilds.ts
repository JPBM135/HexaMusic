import type { Guilds, GuildsInput } from '../../@types/db-schema.js';
import type { SelectiveUpdate, TypedOmit } from '../../@types/utils.js';
import { NOT_MODIFIED_SYMBOL } from '../../constants/common.js';
import { sanitizeUpdate } from '../../core/utils/sanitizeUpdate.js';
import { resolveToken } from '../../core/utils/tokens.js';
import { undefinedCoalescing } from '../../core/utils/undefinedlishCoalescing.js';
import { kSql } from '../../tokens.js';

export async function updateGuilds(id: string, data: Partial<GuildsInput>): Promise<Guilds> {
  const sql = resolveToken(kSql);

  const updateData: SelectiveUpdate<TypedOmit<GuildsInput, 'created_at' | 'id' | 'updated_at'>> = {
    channel_id: undefinedCoalescing(data.channel_id, NOT_MODIFIED_SYMBOL),
    locale: data.locale ?? NOT_MODIFIED_SYMBOL,
    message_id: undefinedCoalescing(data.message_id, NOT_MODIFIED_SYMBOL),
    restricted_role_id: undefinedCoalescing(data.restricted_role_id, NOT_MODIFIED_SYMBOL),
  };

  const sanitizedData = sanitizeUpdate(updateData);

  const [guild] = await sql<Guilds>('guilds').update(sanitizedData).where('id', id).returning('*');

  return guild!;
}
