import { type VoiceConnection, type VoiceConnectionStatus, entersState } from '@discordjs/voice';

export async function promisifyEnterState(
	connection: VoiceConnection,
	state: VoiceConnectionStatus,
	timeout: number,
): Promise<boolean> {
	try {
		await entersState(connection!, state, timeout);
		return true;
	} catch {
		return false;
	}
}
