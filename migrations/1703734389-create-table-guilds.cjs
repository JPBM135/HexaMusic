/**
 * @param {import('postgres').Sql} client
 */
exports.up = async (client) => {
  await client.unsafe(/* sql*/ `
		create type supported_locales as enum (
			'en-us',
			'pt-br'
		);
	`);

  await client.unsafe(/* sql*/ `
		create table guilds (
			id varchar(22) primary key,
			guild_id varchar(22) not null unique,
			locale supported_locales not null default 'en-us',
			channel_id varchar(22),
			message_id varchar(22),
			restricted_role_id varchar(22),
			created_at timestamp not null default now(),
			updated_at timestamp not null default now()
		);
	`);

  await client.unsafe(/* sql*/ `
		create trigger update_modified_column_guilds_update
			before update on guilds
			for each row
			execute procedure update_modified_column();
	`);

  await client.unsafe(/* sql*/ `
		create index guilds_guild_id_index on guilds(guild_id);
	`);

  await client.unsafe(/* sql*/ `
		comment on column guilds.id is 'the guild id (used as whitelist)';
		comment on column guilds.locale is 'the locale of the guild';
		comment on column guilds.channel_id is 'the channel id where the message is sent to so the bot can react to it';
		comment on column guilds.message_id is 'the message id where the bot will edit to show the current status of the queue';
		comment on column guilds.created_at is 'the date when the guild was added to the database';
		comment on column guilds.updated_at is 'the date when the guild was last updated';
	`);
};

/**
 * @param {import('postgres').Sql} client
 */
exports.down = async (client) => {
  await client.unsafe(/* sql*/ `
		DROP TABLE guilds;
	`);
};
