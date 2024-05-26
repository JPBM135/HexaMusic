# HexaMusic

HexaMusic is a discord bot that allows you to play music in your discord server. It is a simple bot that can play music from youtube and spotify.

Its built using Discord.js and ytdl-core, as well as some experimental features using FFMPEG for audio manipulation and effects.

## Installation

To install HexaMusic, you need to have Node.js installed on your system. You can download it from [here](https://nodejs.org/).

**Step 1:** Clone the repository

**Step 2:** Install the dependencies

```bash
npm install yarn -g && yarn --immutable
```

**Step 3:** Create a `.env` file in the root directory of the project following the `.env.example` file.

**Step 4:** Start the bot

```bash
yarn start
```

## Usage

To use HexaMusic, you need to invite the bot to your server. You can do this by creating a bot application on the [Discord Developer Portal](https://discord.com/developers/applications) and then generating an invite link.

Once the bot is in your server, create an channel and add its content to the `.env` file.

Restart the bot and you should see a new message in the channel you just created.

After that, you need to copy the message id and add it to the `.env` file at the same position its channel id is.

Restart the bot and you should be able to use it by just sending a message in the channel.

> [!NOTE]
> We are improving the way to add new channels to the bot, so this process will be easier in the future.

## Support

| Source     | Feature   | Supported |
| ---------- | --------- | --------- |
| Youtube    | Search    | ✅         |
| Youtube    | Playlists | ✅         |
| Youtube    | Videos    | ✅         |
| Youtube    | AutoPlay  | ✅         |
| Spotify    | Search    | ❌         |
| Spotify    | Playlists | ✅         |
| Spotify    | Albums    | ✅         |
| Spotify    | Artists   | ✅         |
| Spotify    | Tracks    | ✅         |
| Spotify    | AutoPlay  | ❌         |
| Soundcloud | *         | ❌         |

## License

We are using the MIT License for this project. You can read more about it [./LICENSE](LICENSE).

## Contributing

We are open to contributions! If you want to help us, you can fork the repository and create a pull request with your changes.
