import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { TextBasedChannel, Guild } from 'discord.js';
import i18next from 'i18next';
import { SupportedLocales } from '../../../@types/enums.js';
import { GUILD_NOT_ALLOWED } from '../../../constants/messages.js';
import { getGuildByGuildId } from '../../../database/guilds/getGuilds.js';
import logger from '../../../logger.js';
import { createInitialChannel } from './utils/createChannel.js';
import { createRestrictedRole } from './utils/createRole.js';

export async function handleGuildCreate(guild: Guild) {
  try {
    const guildData = await getGuildByGuildId(guild.id);

    const channelICanSendMessagesIn = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages),
    );

    const effectiveChannel =
      (channelICanSendMessagesIn as TextBasedChannel) ?? (await guild.fetchOwner()).user;

    if (!guildData && guild.members.me) {
      try {
        await effectiveChannel.send(GUILD_NOT_ALLOWED(guild.preferredLocale));
        await guild.leave();
      } catch (error) {
        logger.error(`Failed to leave ${guild.id}!`, error);
      }

      return;
    }

    const createChannelResult = await createInitialChannel(guild, guildData!);
    const createdRestrictedRoleResult = await createRestrictedRole(guild, guildData!);

    await effectiveChannel.send({
      embeds: [
        {
          author: {
            name: i18next.t('common.events.guild-created.initial-setup.author', {
              lng: guildData?.locale ?? SupportedLocales.EnUs,
              guildName: guild.name,
            }),
            icon_url: guild.iconURL() ?? undefined,
          },
          description: i18next.t('common.events.guild-created.initial-setup.description', {
            lng: guildData?.locale ?? SupportedLocales.EnUs,
            guildName: guild.name,
            createdChannelResult: createChannelResult.message,
            createdRestrictedRoleResult: createdRestrictedRoleResult.message,
          }),
        },
      ],
    });
  } catch (error) {
    logger.error(`Failed to handle guildCreate event for ${guild.id}!`, error);
  }
}
