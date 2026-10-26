import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js'
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function deployCommands() {

  const commands = [];

  const foldersPath = path.join(import.meta.dir, 'commands');
  const commandFiles: string[] = fs.readdirSync(foldersPath)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

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

  if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN empty');
  if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID empty');

  const rest = new REST().setToken(process.env.BOT_TOKEN);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // let applicationCommands;
    // if (process.env.GUILD_ID) {
    //   applicationCommands = Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    // } else {
    //   applicationCommands = Routes.applicationCommands(process.env.CLIENT_ID)
    // }
    let applicationCommands = Routes.applicationCommands(process.env.CLIENT_ID)
    
    const data = await rest.put(
      applicationCommands,
      { body: commands },
    ) as { length: number };

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
}

deployCommands();