import type { Guild } from 'discord.js';
import { PermissionFlagsBits, ChannelType } from 'discord.js';
import i18next from 'i18next';
import type { Guilds } from '../../../../@types/db-schema.js';
import { SupportedLocales } from '../../../../@types/enums.js';
import { config } from '../../../../config.js';
import { generateQueueMessage } from '../../../../core/queueMessage/generateMessage.js';
import { updateGuilds } from '../../../../database/guilds/updateGuilds.js';
import logger from '../../../../logger.js';

export async function createInitialChannel(guild: Guild, guildData: Guilds) {
  try {
    if (guildData.channel_id) {
      const channel = await guild.channels.fetch(guildData.channel_id);

      if (channel && channel.isTextBased()) {
        const message = guildData.message_id
          ? await channel.messages.fetch(guildData.message_id)
          : null;

        if (!message) {
          const createdMessage = await channel.send(
            await generateQueueMessage(guild, null, [], guildData?.locale ?? SupportedLocales.EnUs),
          );

          await updateGuilds(guild.id, {
            message_id: createdMessage.id,
          });
        }

        return {
          success: true,
          message: i18next.t('common.events.guild-created.channel-already-exists', {
            lng: guild.preferredLocale,
            channelName: channel.name,
          }),
        };
      }
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return {
        success: false,
        message: i18next.t(
          'common.events.guild-created.missing-permission.create-initial-channel',
          {
            lng: guild.preferredLocale,
          },
        ),
      };
    }

    const createdChannel = await guild.channels.create({
      name: 'hexa-music',
      type: ChannelType.GuildText,
      reason: i18next.t('common.audit-logs.created-initial-channel', {
        lng: guild.preferredLocale,
      }),
      topic: i18next.t('common.events.guild-created.channel-channel-topic', {
        lng: guild.preferredLocale,
      }),
    });

    await updateGuilds(guild.id, {
      channel_id: createdChannel.id,
    });

    const createdMessage = await createdChannel.send(
      await generateQueueMessage(guild, null, [], guildData?.locale ?? SupportedLocales.EnUs),
    );

    await updateGuilds(guild.id, {
      message_id: createdMessage.id,
    });

    return {
      success: true,
      message: i18next.t('common.events.guild-created.created-initial-channel', {
        lng: guild.preferredLocale,
        channelName: createdChannel.name,
        BOT_NAME: config.BOT_NAME,
      }),
    };
  } catch (error) {
    logger.error(`Failed to create channel for ${guild.id}!`, error);

    return {
      success: false,
      message: i18next.t('errors.unknown-error', {
        lng: guildData?.locale ?? SupportedLocales.EnUs,
      }),
    };
  }
}
