import { Colors, type MessageCreateOptions } from 'discord.js';
import i18next from 'i18next';

export const GUILD_NOT_ALLOWED: (locale: string) => MessageCreateOptions = (locale) => ({
  embeds: [
    {
      description: i18next.t('errors.events.guild-create.guild-not-allowed', { lng: locale }),
      color: Colors.Red,
    },
  ],
});
