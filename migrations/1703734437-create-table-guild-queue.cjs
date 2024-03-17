/**
 * @param {import('postgres').Sql} client
 */
exports.up = async (client) => {
  await client.unsafe(/* sql*/ `
		create type repeat_mode as enum (
			'off',
			'one',
			'all'
		);
	`);

  await client.unsafe(/* sql*/ `
		create type queue_state as enum (
			'playing',
			'paused',
			'empty',
			'error'
		)
	`);

  await client.unsafe(/* sql*/ `
		create table guilds_queue (
			id varchar(22) primary key,
			guild_id varchar(22) not null references guilds(guild_id) on delete no action,
			state queue_state not null default 'empty',
			is_connected boolean not null default false,
			voice_channel_id varchar(22),
			current_song_id varchar(22),
			repeat_mode repeat_mode not null default 'off',
			playing_at timestamp,
			paused_at timestamp,
			empty_at timestamp,
			created_at timestamp not null default now(),
			updated_at timestamp not null default now()
		);
	`);

  await client.unsafe(/* sql*/ `
		create trigger update_modified_column_guilds_queue_update
			before update on guilds_queue
			for each row
			execute procedure update_modified_column();
	`);

  await client.unsafe(/* sql*/ `
		create index guilds_queue_guild_id_index on guilds_queue(guild_id);
	`);
};

/**
 * @param {import('postgres').Sql} client
 */
exports.down = async (client) => {
  await client.unsafe(/* sql*/ `
		DROP TABLE guilds_queue;
	`);
};
