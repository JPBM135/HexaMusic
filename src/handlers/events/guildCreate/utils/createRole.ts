import { PermissionFlagsBits, type Guild } from 'discord.js';
import i18next from 'i18next';
import type { Guilds } from '../../../../@types/db-schema.js';
import { SupportedLocales } from '../../../../@types/enums.js';
import { config } from '../../../../config.js';
import { updateGuilds } from '../../../../database/guilds/updateGuilds.js';
import logger from '../../../../logger.js';

export async function createRestrictedRole(guild: Guild, guildData: Guilds) {
  try {
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return {
        success: false,
        message: i18next.t(
          'common.events.guild-created.missing-permission.create-restricted-role',
          {
            lng: guildData?.locale ?? SupportedLocales.EnUs,
          },
        ),
      };
    }

    const createdRestrictedRole = await guild.roles.create({
      name: 'Hexa Music Restricted',
      reason: i18next.t('common.audit-logs.created-initial-restricted-role', {
        lng: guildData?.locale ?? SupportedLocales.EnUs,
        BOT_NAME: config.BOT_NAME,
      }),
      permissions: [],
    });

    await updateGuilds(guild.id, {
      restricted_role_id: createdRestrictedRole.id,
    });

    return {
      success: true,
      message: i18next.t('common.events.guild-created.created-restricted-role', {
        lng: guildData?.locale ?? SupportedLocales.EnUs,
        roleName: createdRestrictedRole.name,
        BOT_NAME: config.BOT_NAME,
      }),
    };
  } catch (error) {
    logger.error(`Failed to create restricted role for ${guild.id}!`, error);

    return {
      success: false,
      message: i18next.t('errors.unknown-error', {
        lng: guildData?.locale ?? SupportedLocales.EnUs,
      }),
    };
  }
}
