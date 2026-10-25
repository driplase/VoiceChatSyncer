import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, Events, GatewayIntentBits, MessageFlags, REST, Routes } from 'discord.js';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath, { recursive: true }).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(foldersPath, file);
  const commandModule = await import(url.pathToFileURL(filePath).href);
  const command = commandModule.default ?? commandModule;
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  }
});

client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.login(process.env.TOKEN);