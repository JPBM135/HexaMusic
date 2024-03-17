import process from 'node:process';

export const config = {
  INSTANCE_ID: process.env.NODE_APP_INSTANCE ?? '0',
  DISCORD_TOKEN: process.env.DISCORD_TOKEN as string,
  OWNER_ID: process.env.OWNER_ID as string,
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID as string,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET as string,
  BOT_NAME: process.env.BOT_NAME as string,
  PGHOST: process.env.PGHOST as string,
  PGUSER: process.env.PGUSER as string,
  PGPASSWORD: process.env.PGPASSWORD as string,
  PGDATABASE: process.env.PGDATABASE as string,
  PGPORT: Number(process.env.PGPORT),
} as const;
