import {
  hyperlink,
  type APIEmbed,
  type Guild,
  inlineCode,
  time,
  TimestampStyles,
} from 'discord.js';
import i18next from 'i18next';
import type { GuildsQueue, GuildSongs } from '../../@types/db-schema.js';
import { QueueState } from '../../@types/enums.js';
import { BASE_IMAGE_URL } from '../../constants/common.js';
import type { SongMetadata } from '../songs/resolveMetadata.js';
import { formatDuration } from '../utils/formatDuration.js';

export async function generateEmbed(
  guild: Guild,
  queue: GuildsQueue | null,
  songs: GuildSongs[],
  locale: string,
): Promise<[APIEmbed]> {
  const queueIsPlaying = queue?.state === QueueState.Playing || queue?.state === QueueState.Paused;

  const currentSong = songs.find((song) => song.id === queue?.current_song_id);

  if (!queue || !queueIsPlaying || !currentSong) {
    return [
      {
        author: {
          name: i18next.t('messages.queue.embed.not_playing.author', {
            lng: locale,
            guild: guild.name,
          }),
          icon_url: guild.iconURL() ?? undefined,
        },
        description: i18next.t('messages.queue.embed.not_playing.description', { lng: locale }),
        image: {
          url: BASE_IMAGE_URL,
        },
        footer: {
          text: i18next.t('messages.queue.embed.not_playing.footer', { lng: locale }),
        },
      },
    ];
  }

  const currentOwner = await guild.members
    .fetch({ user: currentSong.requested_by, cache: true })
    .catch(() => null);
  const currentSongMetadata = currentSong?.metadata as SongMetadata;

  const playingAt = new Date(queue.playing_at!);

  return [
    {
      author: {
        name: i18next.t('messages.queue.embed.author', {
          lng: locale,
          owner: currentOwner?.displayName ?? 'Unknown',
        }),
        icon_url: currentOwner ? currentOwner.displayAvatarURL() : guild.iconURL() ?? undefined,
      },
      description: i18next.t('messages.queue.embed.description', {
        lng: locale,
        title: hyperlink(inlineCode(currentSongMetadata.title), currentSongMetadata.url),
        channel: hyperlink(
          inlineCode(currentSongMetadata.artist.name),
          currentSongMetadata.artist.url,
        ),
        duration: formatDuration(currentSongMetadata.duration),
        timestamp: time(
          new Date(currentSongMetadata.duration + playingAt.getTime()),
          TimestampStyles.RelativeTime,
        ),
      }),
    },
  ];
}
