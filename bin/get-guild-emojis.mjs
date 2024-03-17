import { writeFile } from 'node:fs/promises';
import { CDNRoutes, ImageFormat } from 'discord.js';
import emojis from './emojis.json' assert { type: 'json' };

for (const emoji of emojis) {
  const emojiUrl = CDNRoutes.emoji(emoji.id, emoji.animated ? ImageFormat.GIF : ImageFormat.PNG);

  const emojiBuffer = await fetch(`https://cdn.discordapp.com${emojiUrl}`).then((res) =>
    res.arrayBuffer(),
  );

  if (!emojiBuffer) {
    console.log(`Failed to get emoji for ${emoji.name} (${emoji.id})`);
    continue;
  }

  await writeFile(
    `./emojis/${emoji.name}${emoji.animated ? '.gif' : '.png'}`,
    Buffer.from(emojiBuffer),
  );

  console.log(`Downloaded ${emoji.name} (${emoji.id})`);
}
