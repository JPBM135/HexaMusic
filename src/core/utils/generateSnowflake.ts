import { config } from '../../config.js';
import { kSnowflake } from '../../tokens.js';
import { resolveToken } from './tokens.js';

export function generateSnowflake() {
  const instance = resolveToken(kSnowflake);

  return String(
    instance.generate({
      workerId: BigInt(config.INSTANCE_ID),
    }),
  );
}
