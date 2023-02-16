import { type VoiceState, channelMention } from 'discord.js';
import { Emojis } from '../constants.js';
import { resolveQueue } from '../utils/resolveQueue.js';
import { sendMessage } from '../utils/textChannel.js';

export const VoiceStateEvent = {
	name: 'voiceStateUpdate',
	async execute(_: VoiceState, newState: VoiceState) {
		if (newState.member?.id === newState.client.user.id) {
			const queue = resolveQueue(newState.guild.id);
			if (!queue) return;

			if (newState.channel && newState.channel?.id !== queue.voiceChannel.id) {
				queue.voiceChannel = newState.channel;
				void sendMessage(
					newState.guild.id,
					`${Emojis.OrangeConnection} | Conectado ao canal de voz ${channelMention(newState.channel.id)}!`,
				);
			}
		}
	},
};
