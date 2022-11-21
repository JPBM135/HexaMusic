import process from 'node:process';
import type { EnvironmentalVariables } from '../constants.js';

export function resolveEnv(env: EnvironmentalVariables): string {
	return process.env[env] ?? '';
}
