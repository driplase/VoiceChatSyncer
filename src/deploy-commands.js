import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js'
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath, { recursive: true }).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(foldersPath, file);
  const commandModule = await import(url.pathToFileURL(filePath).href);
  const command = commandModule.default ?? commandModule;
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set

    let applicationCommands;
    if (process.env.GUILD_ID) {
      applicationCommands = Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    } else {
      applicationCommands = Routes.applicationCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    }
    
    const data = await rest.put(
      applicationCommands,
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();