/**
 * @param {import('postgres').Sql} client
 */
exports.up = async (client) => {
  await client.unsafe(/* sql*/ `
		create or replace function update_modified_column()
			returns trigger as $$
			begin
				new.updated_at = now();
			return new;
		end;
		$$ language 'plpgsql';
	`);
};

/**
 * @param {import('postgres').Sql} client
 */
exports.down = async (client) => {
  await client.unsafe(/* sql*/ `
		DROP FUNCTION update_modified_column;
	`);
};
