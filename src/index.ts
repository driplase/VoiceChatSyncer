import path from 'node:path';
import { Client, Events, GatewayIntentBits, Collection, CommandInteraction, Partials, Guild, MessageFlags, TextChannel } from 'discord.js';
import fs from 'node:fs';
import { handleMessageCreate, handleMessageDelete, handleMessageUpdate } from './message/copy';

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
  ],
	partials: [
		Partials.Message, 
		Partials.Channel,
	]
});

client.commands = new Collection();

const folderPath = path.join(import.meta.dir, "commands");
const commandFiles = fs.readdirSync(folderPath)
	.filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of commandFiles) {
	const filePath = path.join(folderPath, file);

	(async () => {
		const command = await import(filePath);

		if (command.data && command.execute) {
			if (!client.commands) return;
			client.commands.set(command.data.name, command.execute);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	})();
}

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});

client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, handleMessageCreate);
client.on(Events.MessageUpdate, handleMessageUpdate);
client.on(Events.MessageDelete, handleMessageDelete);

client.login(process.env.BOT_TOKEN);