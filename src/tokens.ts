import type { Snowflake } from '@sapphire/snowflake';
import type { Client as DscClient } from 'discord.js';
import type { Knex } from 'knex';

export const kSql = Symbol('sql');
export const kDiscordClient = Symbol('discordClient');
export const kSnowflake = Symbol('snowflake');

export interface TokenMap {
  [kDiscordClient]: DscClient;
  [kSnowflake]: Snowflake;
  [kSql]: Knex;
}
