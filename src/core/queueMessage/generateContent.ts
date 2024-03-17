import type { Guild } from 'discord.js';
import i18next from 'i18next';
import type { GuildsQueue, GuildSongs } from '../../@types/db-schema.js';
import { QueueState } from '../../@types/enums.js';
import type { SongMetadata } from '../songs/resolveMetadata.js';
import { findEmoji } from './findEmoji.js';

export async function generateContent(
  guild: Guild,
  queue: GuildsQueue | null,
  songs: GuildSongs[],
  locale: string,
): Promise<string> {
  const contentParts: string[] = [
    i18next.t('messages.queue.content.base', { lng: locale, guild: guild.name }),
  ];

  if (!queue || queue.state === QueueState.Empty) {
    contentParts.push(i18next.t('messages.queue.content.not_playing', { lng: locale }));
    return contentParts.join('\n\n');
  }

  if (songs.length === 0) {
    contentParts.push(i18next.t('messages.queue.content.empty', { lng: locale }));
    return contentParts.join('\n\n');
  }

  const sortedSongs = songs.sort((a, b) => a.position - b.position);

  const songsParts: string[] = ['\n'];
  let size = contentParts.join('\n').length + 1;

  for (const song of sortedSongs) {
    const songPart = i18next.t('messages.queue.content.track', {
      lng: locale,
      emoji: findEmoji(song.source),
      title: (song.metadata as SongMetadata).title,
      owner: await guild.members
        .fetch({
          user: song.requested_by,
          cache: true,
        })
        .then((member) => member.displayName),
    });

    if (size + songPart.length > 1_900) {
      songsParts.push(
        i18next.t('messages.queue.content.and_more', {
          lng: locale,
          count: sortedSongs.length - songsParts.length,
        }),
      );
      break;
    }

    songsParts.push(songPart);
    size += songPart.length + 2;
  }

  contentParts.push(...songsParts.reverse());

  return contentParts.join('\n');
}
