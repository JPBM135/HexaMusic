import process from 'node:process';
import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';
import { container } from 'tsyringe';
import { EnvironmentalVariables } from './constants.js';
import logger from './logger.js';
import { kPrometheus } from './tokens.js';
import { resolveEnv } from './utils/env.js';

export function createPromRegistry() {
	container.register(kPrometheus, { useValue: register });

	collectDefaultMetrics({
		register,
		prefix: `${resolveEnv(EnvironmentalVariables.Prefix)}_music_`,
	});

	const app = express();

	app.get('/metrics', async (_, res) => {
		logger.debug('[Metrics]: Prometheus metrics server received request');

		res.set('Content-Type', register.contentType);
		res.end(await register.metrics());
	});

	app.listen(process.env.PORT ?? 3_000, () => {
		logger.success('[Metrics]: Prometheus metrics server started', {
			port: process.env.PORT ?? 3_000,
		});
	});
}
