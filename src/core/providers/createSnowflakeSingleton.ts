import { Snowflake } from '@sapphire/snowflake';
import { SNOWFLAKE_EPOCH } from '../../constants/common.js';
import logger from '../../logger.js';
import { kSnowflake } from '../../tokens.js';
import { registerToken } from '../utils/tokens.js';

export function createSnowflakeSingleton() {
  const snowflake = new Snowflake(SNOWFLAKE_EPOCH);

  registerToken(kSnowflake, snowflake);

  logger.success('[Snowflake]: Snowflake singleton created');
  return snowflake;
}
