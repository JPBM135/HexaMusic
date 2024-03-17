/**
 * @param {import('postgres').Sql} client
 */
exports.up = async (client) => {
  await client.unsafe(/* sql*/ `
		create type song_source as enum (
			'youtube_search',
			'youtube_playlist',
			'youtube_video',
			'youtube_channel',
			'youtube_livestream',
			'spotify_track',
			'spotify_album',
			'spotify_playlist',
			'spotify_artist',
			'autoplay',
			'local'
		);
	`);

  await client.unsafe(/* sql*/ `
		create table guild_songs (
			id varchar(22) primary key,
			guild_id varchar(22) not null,
			requested_by varchar(22) not null,
			position integer not null,
			is_repeated boolean not null default false,
			source song_source not null,
			metadata jsonb not null default '{}',
			created_at timestamp not null default now(),
			updated_at timestamp not null default now()
		);
	`);

  await client.unsafe(/* sql*/ `
		create trigger update_modified_column_guild_songs_update
			before update on guild_songs
			for each row
			execute procedure update_modified_column();

		create index guild_songs_guild_id_index on guild_songs(guild_id);
	`);

  await client.unsafe(/* sql*/ `
		comment on column guild_songs.id is 'the id of the guild song';
		comment on column guild_songs.guild_id is 'the id of the guild';
		comment on column guild_songs.created_at is 'the date when the guild song was added to the database';
		comment on column guild_songs.updated_at is 'the date when the guild song was last updated';
	`);

  await client.unsafe(/* sql*/ `
		alter table guilds_queue
			add constraint fk_guilds_queue
			foreign key (current_song_id) references guild_songs(id) on delete no action;
	`);
};

/**
 * @param {import('postgres').Sql} client
 */
exports.down = async (client) => {
  await client.unsafe(/* sql*/ `
		DROP TABLE guild_songs;
	`);
};
